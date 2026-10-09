import { beforeEach, describe, expect, it } from "vitest";
import {
  InvalidSlugError,
  InvalidUrlError,
  MAX_CUSTOM_SLUGS_PER_OWNER,
  ShortUrlNotFoundError,
  ShortUrlService,
  SlugLimitError,
  SlugLockedError,
  SlugTakenError,
  type Viewer,
} from "../src";
import { InMemoryShortUrlRepository } from "./in-memory-short-url.repository";

/** Returns the given codes in order, to force collisions deterministically. */
function sequence(...codes: string[]) {
  return () => {
    const code = codes.shift();
    if (!code) throw new Error("sequence exhausted");
    return code;
  };
}

const alice: Viewer = { ownerId: "alice", isAdmin: false };
const bob: Viewer = { ownerId: "bob", isAdmin: false };
const stranger: Viewer = { ownerId: null, isAdmin: false };
const admin: Viewer = { ownerId: null, isAdmin: true };

const input = (
  overrides: Partial<Parameters<ShortUrlService["shorten"]>[0]> = {},
) => ({
  url: "https://example.com",
  isPublic: false,
  ownerId: "alice",
  ...overrides,
});

describe("ShortUrlService", () => {
  let repository: InMemoryShortUrlRepository;
  let service: ShortUrlService;

  beforeEach(() => {
    repository = new InMemoryShortUrlRepository();
    service = new ShortUrlService(repository, { blockedHosts: ["d3b.it"] });
  });

  describe("shorten", () => {
    it("stores the normalized URL with its owner and visibility", async () => {
      service = new ShortUrlService(repository, {
        generateCode: sequence("abcd234"),
      });

      const shortUrl = await service.shorten(
        input({ url: "example.com", isPublic: true }),
      );

      expect(shortUrl).toMatchObject({
        code: "abcd234",
        targetUrl: "https://example.com/",
        ownerId: "alice",
        isPublic: true,
        isCustomSlug: false,
      });
    });

    it("gives every submission its own link (stats are per owner)", async () => {
      const a = await service.shorten(input());
      const b = await service.shorten(input({ ownerId: "bob" }));

      expect(a.code).not.toBe(b.code);
    });

    it("retries with a fresh code when the generated one is taken", async () => {
      service = new ShortUrlService(repository, {
        generateCode: sequence("taken22", "TAKEN22", "fresh22"),
      });

      await service.shorten(input());
      const shortUrl = await service.shorten(input()); // "TAKEN22" collides ignoring case

      expect(shortUrl.code).toBe("fresh22");
      expect(repository.createCalls).toBe(3);
    });

    it("gives up after maxCodeAttempts collisions instead of looping forever", async () => {
      service = new ShortUrlService(repository, {
        generateCode: () => "same222",
        maxCodeAttempts: 3,
      });
      await service.shorten(input());

      await expect(service.shorten(input())).rejects.toThrow(
        /after 3 attempts/,
      );
    });

    it("uses a valid custom slug as the code", async () => {
      const shortUrl = await service.shorten(input({ slug: " ShOrTUr1 " }));

      expect(shortUrl).toMatchObject({ code: "ShOrTUr1", isCustomSlug: true });
    });

    it("rejects a custom slug that is taken in any letter case", async () => {
      await service.shorten(input({ slug: "launch-day" }));

      await expect(
        service.shorten(input({ ownerId: "bob", slug: "Launch-Day" })),
      ).rejects.toBeInstanceOf(SlugTakenError);
    });

    it("caps custom slugs per owner", async () => {
      for (let i = 0; i < MAX_CUSTOM_SLUGS_PER_OWNER; i++) {
        await service.shorten(input({ slug: `slug-${i}` }));
      }

      await expect(
        service.shorten(input({ slug: "one-more" })),
      ).rejects.toBeInstanceOf(SlugLimitError);
      // Random codes are not limited.
      await expect(service.shorten(input())).resolves.toBeDefined();
    });

    it("rejects invalid URLs and slugs without touching storage", async () => {
      await expect(
        service.shorten(input({ url: "javascript:alert(1)" })),
      ).rejects.toBeInstanceOf(InvalidUrlError);
      await expect(
        service.shorten(input({ url: "https://d3b.it/r/abc" })),
      ).rejects.toBeInstanceOf(InvalidUrlError);
      await expect(
        service.shorten(input({ slug: "admin" })),
      ).rejects.toBeInstanceOf(InvalidSlugError);
      expect(repository.createCalls).toBe(0);
    });
  });

  describe("resolve", () => {
    it("finds links ignoring case and skips the lookup for malformed codes", async () => {
      await service.shorten(input({ slug: "ShOrTUr1" }));

      expect(await service.resolve("shortur1")).toMatchObject({
        code: "ShOrTUr1",
      });
      expect(await service.resolve("nope2345")).toBeNull();
      expect(await service.resolve("../../etc/passwd")).toBeNull();
      expect(repository.findCalls).toBe(2);
    });

    it("still redirects links an admin has hidden", async () => {
      await service.shorten(input({ slug: "hidden-one", isPublic: true }));
      await service.setHidden("hidden-one", admin, true);

      expect(await service.resolve("hidden-one")).not.toBeNull();
    });
  });

  describe("who can see stats", () => {
    beforeEach(async () => {
      await service.shorten(input({ slug: "private-a" }));
      await service.shorten(input({ slug: "public-a", isPublic: true }));
    });

    it("lets the owner and admins see private links", async () => {
      await expect(
        service.getForViewer("private-a", alice),
      ).resolves.toMatchObject({
        canManage: true,
      });
      await expect(
        service.getForViewer("private-a", admin),
      ).resolves.toMatchObject({
        canManage: true,
      });
    });

    it("hides private links from everyone else as if they didn't exist", async () => {
      await expect(
        service.getForViewer("private-a", bob),
      ).rejects.toBeInstanceOf(ShortUrlNotFoundError);
      await expect(
        service.getForViewer("private-a", stranger),
      ).rejects.toBeInstanceOf(ShortUrlNotFoundError);
    });

    it("shows public links to everyone, read-only", async () => {
      await expect(
        service.getForViewer("public-a", stranger),
      ).resolves.toMatchObject({
        canManage: false,
      });
    });

    it("stops showing a public link once an admin hides it", async () => {
      await service.setHidden("public-a", admin, true);

      await expect(
        service.getForViewer("public-a", stranger),
      ).rejects.toBeInstanceOf(ShortUrlNotFoundError);
      await expect(
        service.getForViewer("public-a", alice),
      ).resolves.toBeDefined();
    });

    it("lists only the owner's own links", async () => {
      await service.shorten(input({ ownerId: "bob", slug: "bobs-link" }));

      const codes = (await service.listForOwner("alice")).map((s) => s.code);

      expect(codes.sort()).toEqual(["private-a", "public-a"]);
    });
  });

  describe("managing a link", () => {
    beforeEach(async () => {
      await service.shorten(input({ slug: "my-link" }));
    });

    it("lets the owner toggle visibility, but nobody else", async () => {
      await expect(
        service.setVisibility("my-link", bob, true),
      ).rejects.toBeInstanceOf(ShortUrlNotFoundError);

      await service.setVisibility("my-link", alice, true);
      expect(repository.rows[0].isPublic).toBe(true);

      // Public now, so Bob can see it, but still not manage it.
      await expect(
        service.setVisibility("my-link", bob, false),
      ).rejects.toBeInstanceOf(ShortUrlNotFoundError);
    });

    it("lets the owner rename the slug until the first click", async () => {
      await service.changeSlug("my-link", alice, "better-name");
      expect(repository.rows[0].code).toBe("better-name");

      repository.clickCounts.set(repository.rows[0].id, 1);
      await expect(
        service.changeSlug("better-name", alice, "again-new"),
      ).rejects.toBeInstanceOf(SlugLockedError);
    });

    it("rejects renaming to a taken slug", async () => {
      await service.shorten(input({ ownerId: "bob", slug: "taken-one" }));

      await expect(
        service.changeSlug("my-link", alice, "TAKEN-ONE"),
      ).rejects.toBeInstanceOf(SlugTakenError);
    });

    it("keeps admin actions admin-only", async () => {
      await expect(service.listAll(alice)).rejects.toThrow("Link not found.");
      await expect(service.setHidden("my-link", alice, true)).rejects.toThrow();
      await expect(service.listAll(admin)).resolves.toHaveLength(1);
    });

    it("lets the owner or an admin delete, nobody else", async () => {
      await expect(service.delete("my-link", bob)).rejects.toBeInstanceOf(
        ShortUrlNotFoundError,
      );
      await service.delete("my-link", alice);

      expect(repository.rows).toHaveLength(0);
    });
  });
});

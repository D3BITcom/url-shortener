import {
  DuplicateShortCodeError,
  type NewClick,
  type NewShortUrl,
} from "@url-shortener/engine";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  PrismaClickRepository,
  PrismaOwnerRepository,
  PrismaShortUrlRepository,
  type PrismaClient,
} from "../src";
import { createTestDatabase } from "./test-database";

let prisma: PrismaClient;
let cleanup: () => Promise<void>;
let shortUrls: PrismaShortUrlRepository;
let clicks: PrismaClickRepository;
let owners: PrismaOwnerRepository;
let ownerId: string;

beforeAll(async () => {
  ({ prisma, cleanup } = await createTestDatabase());
  shortUrls = new PrismaShortUrlRepository(prisma);
  clicks = new PrismaClickRepository(prisma);
  owners = new PrismaOwnerRepository(prisma);
});

afterAll(() => cleanup());

beforeEach(async () => {
  await prisma.click.deleteMany();
  await prisma.shortUrl.deleteMany();
  await prisma.owner.deleteMany();
  ownerId = (await owners.create({ secretHash: "hash-a" })).id;
});

function link(code: string, overrides: Partial<NewShortUrl> = {}): NewShortUrl {
  return {
    code,
    targetUrl: `https://${code}.example/`,
    ownerId,
    isPublic: false,
    isCustomSlug: false,
    ...overrides,
  };
}

function click(
  shortUrlId: string,
  overrides: Partial<NewClick> = {},
): NewClick {
  return {
    shortUrlId,
    occurredAt: new Date("2026-10-09T12:00:00Z"),
    day: "2026-10-09",
    country: "FR",
    browser: "Chrome",
    os: "macOS",
    device: "desktop",
    referrerHost: null,
    visitorId: "visitor-a",
    isBot: false,
    ...overrides,
  };
}

async function backdate(id: string, iso: string) {
  await prisma.shortUrl.update({
    where: { id },
    data: { createdAt: new Date(iso) },
  });
}

describe("PrismaOwnerRepository", () => {
  it("finds owners by secret hash and never returns the hash", async () => {
    const found = await owners.findBySecretHash("hash-a");

    expect(found).toEqual({
      id: ownerId,
      createdAt: expect.any(Date),
      accountId: null,
    });
    expect(await owners.findBySecretHash("nope")).toBeNull();
  });
});

describe("PrismaShortUrlRepository", () => {
  it("creates links and finds them ignoring case, without leaking codeKey", async () => {
    const created = await shortUrls.create(
      link("ShOrTUr1", { isCustomSlug: true }),
    );

    expect(created).toEqual({
      id: expect.any(String),
      code: "ShOrTUr1",
      targetUrl: "https://ShOrTUr1.example/",
      createdAt: expect.any(Date),
      ownerId,
      isPublic: false,
      isCustomSlug: true,
      hiddenAt: null,
    });
    expect(await shortUrls.findByCode("shortur1")).toEqual(created);
    expect(await shortUrls.findByCode("missing1")).toBeNull();
  });

  it("treats codes differing only in case as duplicates, on create and rename", async () => {
    await shortUrls.create(link("launch-day"));
    const other = await shortUrls.create(link("other-one"));

    await expect(shortUrls.create(link("LAUNCH-DAY"))).rejects.toBeInstanceOf(
      DuplicateShortCodeError,
    );
    await expect(
      shortUrls.update(other.id, { code: "Launch-Day" }),
    ).rejects.toBeInstanceOf(DuplicateShortCodeError);
  });

  it("renames, toggles visibility and hides", async () => {
    const created = await shortUrls.create(link("old-name"));
    const hiddenAt = new Date("2026-10-09T10:00:00Z");

    await shortUrls.update(created.id, {
      code: "New-Name",
      isPublic: true,
      hiddenAt,
    });

    expect(await shortUrls.findByCode("new-name")).toMatchObject({
      code: "New-Name",
      isPublic: true,
      hiddenAt,
    });
    expect(await shortUrls.findByCode("old-name")).toBeNull();
  });

  it("lists newest first with human click counts, filtered by owner or search", async () => {
    const other = (await owners.create({ secretHash: "hash-b" })).id;
    const older = await shortUrls.create(link("older-1"));
    await backdate(older.id, "2026-10-01T00:00:00Z");
    await shortUrls.create(link("newer-1"));
    await shortUrls.create(link("theirs-1", { ownerId: other }));
    await clicks.record(
      click(older.id, { occurredAt: new Date("2026-10-05T00:00:00Z") }),
    );
    await clicks.record(
      click(older.id, {
        isBot: true,
        occurredAt: new Date("2026-10-08T00:00:00Z"),
      }),
    );

    const mine = await shortUrls.listSummaries({ ownerId, limit: 10 });
    const searched = await shortUrls.listSummaries({
      search: "theirs",
      limit: 10,
    });

    expect(mine.map((s) => s.code)).toEqual(["newer-1", "older-1"]);
    expect(mine[1]).toMatchObject({
      clickCount: 1,
      lastClickedAt: new Date("2026-10-05T00:00:00Z"),
    });
    expect(searched.map((s) => s.code)).toEqual(["theirs-1"]);
  });

  it("counts only custom slugs toward the owner's quota", async () => {
    await shortUrls.create(link("custom-1", { isCustomSlug: true }));
    await shortUrls.create(link("Rnd2345"));

    expect(await shortUrls.countCustomSlugs(ownerId)).toBe(1);
  });

  it("deletes a link together with its clicks", async () => {
    const created = await shortUrls.create(link("doomed-1"));
    await clicks.record(click(created.id));

    await shortUrls.delete(created.id);

    expect(await prisma.click.count()).toBe(0);
  });

  it("keeps links when their owner is deleted", async () => {
    await shortUrls.create(link("orphan-1"));

    await prisma.owner.delete({ where: { id: ownerId } });

    expect(await shortUrls.findByCode("orphan-1")).toMatchObject({
      ownerId: null,
    });
  });
});

describe("PrismaClickRepository.statsFor", () => {
  it("aggregates human clicks and reports bots separately", async () => {
    const { id } = await shortUrls.create(link("stats-1"));
    const other = await shortUrls.create(link("other-1"));

    await clicks.record(click(id, { day: "2026-09-01" })); // outside the window
    await clicks.record(click(id, { day: "2026-10-08" }));
    await clicks.record(
      click(id, {
        day: "2026-10-09",
        visitorId: "visitor-b",
        referrerHost: "twitter.com",
      }),
    );
    await clicks.record(
      click(id, {
        day: "2026-10-09",
        visitorId: "visitor-b",
        country: null,
        device: "mobile",
        referrerHost: "twitter.com",
      }),
    );
    await clicks.record(click(id, { isBot: true, browser: "Slackbot" }));
    await clicks.record(click(other.id)); // another link's traffic

    const stats = await clicks.statsFor(id, { sinceDay: "2026-10-01" });

    expect(stats).toMatchObject({
      totalClicks: 4,
      uniqueVisitors: 2,
      botClicks: 1,
    });
    expect(stats.byDay).toEqual([
      { day: "2026-10-08", count: 1 },
      { day: "2026-10-09", count: 2 },
    ]);
    expect(stats.byCountry).toEqual([
      { key: "FR", count: 3 },
      { key: null, count: 1 },
    ]);
    expect(stats.byDevice).toEqual([
      { key: "desktop", count: 3 },
      { key: "mobile", count: 1 },
    ]);
    // Tied counts: order between them is unspecified.
    expect(stats.byReferrer).toHaveLength(2);
    expect(stats.byReferrer).toEqual(
      expect.arrayContaining([
        { key: null, count: 2 },
        { key: "twitter.com", count: 2 },
      ]),
    );
    expect(stats.byBrowser).toEqual([{ key: "Chrome", count: 4 }]);
  });
});

describe("PrismaClickRepository.leaderboard", () => {
  const query = {
    sinceDay: null,
    createdBefore: new Date("2026-10-09T11:00:00Z"),
    limit: 10,
  };

  async function publicLink(
    code: string,
    visitors: string[],
    overrides: Partial<NewShortUrl> = {},
  ) {
    const created = await shortUrls.create(
      link(code, { isPublic: true, ...overrides }),
    );
    await backdate(created.id, "2026-10-01T00:00:00Z");
    for (const visitorId of visitors)
      await clicks.record(click(created.id, { visitorId }));
    return created;
  }

  it("ranks public links by unique visitors, ignoring repeat clicks and bots", async () => {
    await publicLink("popular", ["a", "b", "c"]);
    const repeat = await publicLink("repeat-1", ["a", "a", "a", "a"]);
    await clicks.record(click(repeat.id, { visitorId: "bot", isBot: true }));

    const rows = await clicks.leaderboard(query);

    expect(rows).toEqual([
      {
        code: "popular",
        targetUrl: "https://popular.example/",
        uniqueVisitors: 3,
      },
      {
        code: "repeat-1",
        targetUrl: "https://repeat-1.example/",
        uniqueVisitors: 1,
      },
    ]);
  });

  it("leaves out private, hidden, too-new and click-less links", async () => {
    await publicLink("private-1", ["a"], { isPublic: false });
    const hidden = await publicLink("hidden-1", ["a"]);
    await shortUrls.update(hidden.id, { hiddenAt: new Date() });
    const fresh = await shortUrls.create(link("fresh-1", { isPublic: true }));
    await clicks.record(click(fresh.id));
    await publicLink("no-clicks", []);

    expect(await clicks.leaderboard(query)).toEqual([]);
  });

  it("counts only visits since sinceDay for the weekly board", async () => {
    const created = await publicLink("weekly-1", []);
    await clicks.record(
      click(created.id, { visitorId: "old", day: "2026-09-01" }),
    );
    await clicks.record(
      click(created.id, { visitorId: "new", day: "2026-10-08" }),
    );

    const [row] = await clicks.leaderboard({
      ...query,
      sinceDay: "2026-10-03",
    });

    expect(row.uniqueVisitors).toBe(1);
  });
});

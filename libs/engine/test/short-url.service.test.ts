import { beforeEach, describe, expect, it } from "vitest";
import { InvalidUrlError, ShortUrlService } from "../src";
import { InMemoryShortUrlRepository } from "./in-memory-short-url.repository";

/** Returns the given codes in order, to force collisions deterministically. */
function sequence(...codes: string[]) {
  return () => {
    const code = codes.shift();
    if (!code) throw new Error("sequence exhausted");
    return code;
  };
}

describe("ShortUrlService", () => {
  let repository: InMemoryShortUrlRepository;

  beforeEach(() => {
    repository = new InMemoryShortUrlRepository();
  });

  it("stores the normalized URL under a new code", async () => {
    const service = new ShortUrlService(repository, {
      generateCode: sequence("abcd234"),
    });

    const result = await service.shorten("example.com");

    expect(result.created).toBe(true);
    expect(result.shortUrl).toMatchObject({
      code: "abcd234",
      targetUrl: "https://example.com/",
    });
  });

  it("reuses the existing link for the same URL", async () => {
    const service = new ShortUrlService(repository, {
      generateCode: sequence("first22", "second2"),
    });

    const first = await service.shorten("https://example.com");
    const second = await service.shorten("example.com"); // normalizes to the same URL

    expect(second).toEqual({ shortUrl: first.shortUrl, created: false });
    expect(repository.rows).toHaveLength(1);
  });

  it("retries with a fresh code when the generated one is taken", async () => {
    const service = new ShortUrlService(repository, {
      generateCode: sequence("taken22", "taken22", "fresh22"),
    });

    await service.shorten("https://a.example");
    const result = await service.shorten("https://b.example");

    expect(result.shortUrl.code).toBe("fresh22");
    expect(repository.createCalls).toBe(3);
  });

  it("gives up after maxCodeAttempts collisions instead of looping forever", async () => {
    const service = new ShortUrlService(repository, {
      generateCode: () => "same222",
      maxCodeAttempts: 3,
    });
    await service.shorten("https://a.example");

    await expect(service.shorten("https://b.example")).rejects.toThrow(
      /after 3 attempts/,
    );
  });

  it("rejects invalid URLs without touching storage", async () => {
    const service = new ShortUrlService(repository);

    await expect(service.shorten("javascript:alert(1)")).rejects.toBeInstanceOf(
      InvalidUrlError,
    );
    expect(repository.createCalls).toBe(0);
  });

  it("refuses to shorten its own host", async () => {
    const service = new ShortUrlService(repository, {
      blockedHosts: ["sho.rt"],
    });

    await expect(
      service.shorten("https://sho.rt/s/abcd234"),
    ).rejects.toBeInstanceOf(InvalidUrlError);
  });

  it("resolves known codes and skips the lookup for malformed ones", async () => {
    const service = new ShortUrlService(repository, {
      generateCode: sequence("abcd234"),
    });
    await service.shorten("https://example.com");

    expect(await service.resolve("abcd234")).toMatchObject({ code: "abcd234" });
    expect(await service.resolve("nope234")).toBeNull();
    expect(await service.resolve("../../etc/passwd")).toBeNull();
    expect(repository.findByCodeCalls).toBe(2);
  });
});

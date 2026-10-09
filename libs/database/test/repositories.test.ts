import { DuplicateShortCodeError, type NewClick } from "@url-shortener/engine";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  PrismaClickRepository,
  PrismaShortUrlRepository,
  type PrismaClient,
} from "../src";
import { createTestDatabase } from "./test-database";

let prisma: PrismaClient;
let cleanup: () => Promise<void>;
let shortUrls: PrismaShortUrlRepository;
let clicks: PrismaClickRepository;

beforeAll(async () => {
  ({ prisma, cleanup } = await createTestDatabase());
  shortUrls = new PrismaShortUrlRepository(prisma);
  clicks = new PrismaClickRepository(prisma);
});

afterAll(() => cleanup());

beforeEach(async () => {
  await prisma.click.deleteMany();
  await prisma.shortUrl.deleteMany();
});

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

describe("PrismaShortUrlRepository", () => {
  it("creates and finds short URLs by code and by target", async () => {
    const created = await shortUrls.create({
      code: "abcd234",
      targetUrl: "https://example.com/",
    });

    expect(await shortUrls.findByCode("abcd234")).toEqual(created);
    expect(await shortUrls.findByTargetUrl("https://example.com/")).toEqual(
      created,
    );
    expect(await shortUrls.findByCode("missing")).toBeNull();
  });

  it("maps the unique-constraint violation to DuplicateShortCodeError", async () => {
    await shortUrls.create({
      code: "abcd234",
      targetUrl: "https://a.example/",
    });

    await expect(
      shortUrls.create({ code: "abcd234", targetUrl: "https://b.example/" }),
    ).rejects.toBeInstanceOf(DuplicateShortCodeError);
  });

  it("lists newest first with human click counts and last click time", async () => {
    const older = await shortUrls.create({
      code: "older22",
      targetUrl: "https://a.example/",
    });
    const newer = await shortUrls.create({
      code: "newer22",
      targetUrl: "https://b.example/",
    });
    await clicks.record(
      click(older.id, { occurredAt: new Date("2026-10-01T00:00:00Z") }),
    );
    await clicks.record(
      click(older.id, { occurredAt: new Date("2026-10-05T00:00:00Z") }),
    );
    await clicks.record(
      click(older.id, {
        isBot: true,
        occurredAt: new Date("2026-10-08T00:00:00Z"),
      }),
    );

    const list = await shortUrls.listSummaries({ limit: 10 });

    expect(list.map((s) => s.code)).toEqual(["newer22", "older22"]);
    expect(list[0]).toMatchObject({
      id: newer.id,
      clickCount: 0,
      lastClickedAt: null,
    });
    expect(list[1]).toMatchObject({
      clickCount: 2,
      lastClickedAt: new Date("2026-10-05T00:00:00Z"),
    });
  });
});

describe("PrismaClickRepository.statsFor", () => {
  it("aggregates human clicks and reports bots separately", async () => {
    const { id } = await shortUrls.create({
      code: "stats22",
      targetUrl: "https://a.example/",
    });
    const other = await shortUrls.create({
      code: "other22",
      targetUrl: "https://b.example/",
    });

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

  it("returns zeros for a link without clicks", async () => {
    const { id } = await shortUrls.create({
      code: "empty22",
      targetUrl: "https://a.example/",
    });

    const stats = await clicks.statsFor(id, { sinceDay: "2026-10-01" });

    expect(stats).toMatchObject({
      totalClicks: 0,
      uniqueVisitors: 0,
      botClicks: 0,
      byDay: [],
    });
  });
});

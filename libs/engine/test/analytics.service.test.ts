import { describe, expect, it } from "vitest";
import {
  AnalyticsService,
  type ClickRepository,
  type ClickStats,
  type GeoResolver,
  type NewClick,
  type ShortUrl,
} from "../src";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SLACKBOT = "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)";

const shortUrl: ShortUrl = {
  id: "url-1",
  code: "abcd234",
  targetUrl: "https://example.com/",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

class RecordingClickRepository implements ClickRepository {
  readonly clicks: NewClick[] = [];
  stats: ClickStats = emptyStats();
  lastSinceDay?: string;

  async record(click: NewClick) {
    this.clicks.push(click);
  }

  async statsFor(_id: string, { sinceDay }: { sinceDay: string }) {
    this.lastSinceDay = sinceDay;
    return this.stats;
  }
}

const geo: GeoResolver = {
  countryOf: async (ip) => (ip === "203.0.113.7" ? "FR" : null),
};

function setup(now = "2026-10-09T12:00:00Z") {
  const clicks = new RecordingClickRepository();
  let current = new Date(now);
  const service = new AnalyticsService(clicks, {
    geo,
    salt: "test-salt",
    now: () => current,
  });
  return {
    clicks,
    service,
    setNow: (iso: string) => (current = new Date(iso)),
  };
}

describe("AnalyticsService.recordClick", () => {
  it("enriches a click with country, browser, device and referrer", async () => {
    const { clicks, service } = setup();

    await service.recordClick(shortUrl, {
      ip: "203.0.113.7",
      userAgent: SAFARI_IPHONE,
      referrer: "https://www.twitter.com/some/post",
    });

    expect(clicks.clicks[0]).toMatchObject({
      shortUrlId: "url-1",
      day: "2026-10-09",
      country: "FR",
      browser: "Mobile Safari",
      os: "iOS",
      device: "mobile",
      referrerHost: "twitter.com",
      isBot: false,
    });
  });

  it("never stores the raw IP", async () => {
    const { clicks, service } = setup();

    await service.recordClick(shortUrl, {
      ip: "203.0.113.7",
      userAgent: CHROME_MAC,
      referrer: null,
    });

    expect(JSON.stringify(clicks.clicks[0])).not.toContain("203.0.113.7");
    expect(clicks.clicks[0]).toMatchObject({
      device: "desktop",
      referrerHost: null,
    });
  });

  it("flags link-preview bots and requests without a User-Agent", async () => {
    const { clicks, service } = setup();

    await service.recordClick(shortUrl, {
      ip: null,
      userAgent: SLACKBOT,
      referrer: null,
    });
    await service.recordClick(shortUrl, {
      ip: null,
      userAgent: null,
      referrer: null,
    });

    expect(clicks.clicks.map((c) => c.isBot)).toEqual([true, true]);
  });

  it("gives the same visitor the same id within a day, and a new one the next day", async () => {
    const { clicks, service, setNow } = setup("2026-10-09T08:00:00Z");
    const visit = { ip: "203.0.113.7", userAgent: CHROME_MAC, referrer: null };

    await service.recordClick(shortUrl, visit);
    setNow("2026-10-09T23:59:00Z");
    await service.recordClick(shortUrl, visit);
    setNow("2026-10-10T00:01:00Z");
    await service.recordClick(shortUrl, visit);
    await service.recordClick(shortUrl, { ...visit, ip: "198.51.100.1" });

    const [a, b, c, d] = clicks.clicks.map((x) => x.visitorId);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(d).not.toBe(c);
  });
});

describe("AnalyticsService.statsFor", () => {
  it("returns a zero-filled daily series ending today", async () => {
    const { clicks, service } = setup();
    clicks.stats = {
      ...emptyStats(),
      totalClicks: 5,
      byDay: [
        { day: "2026-10-07", count: 2 },
        { day: "2026-10-09", count: 3 },
      ],
    };

    const stats = await service.statsFor(shortUrl, { days: 3 });

    expect(clicks.lastSinceDay).toBe("2026-10-07");
    expect(stats.byDay).toEqual([
      { day: "2026-10-07", count: 2 },
      { day: "2026-10-08", count: 0 },
      { day: "2026-10-09", count: 3 },
    ]);
    expect(stats.totalClicks).toBe(5);
  });
});

function emptyStats(): ClickStats {
  return {
    totalClicks: 0,
    uniqueVisitors: 0,
    botClicks: 0,
    byDay: [],
    byCountry: [],
    byBrowser: [],
    byOs: [],
    byDevice: [],
    byReferrer: [],
  };
}

import type { ShortUrl } from "../short-url/short-url";
import type { ClickStats, DayCount } from "./click";
import type { ClickRepository } from "./click.repository";
import type { GeoResolver } from "./geo-resolver";
import {
  parseUserAgent,
  referrerHost,
  toDay,
  visitorId,
  type VisitContext,
} from "./visit";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type LeaderboardRange = "week" | "all";

export interface LeaderboardEntry {
  rank: number;
  code: string;
  /** Domain only: the leaderboard must not become a free billboard for full scam URLs. */
  targetDomain: string;
  uniqueVisitors: number;
}

export interface AnalyticsServiceOptions {
  geo: GeoResolver;
  /** Secret used for visitor hashing. Rotating it resets unique counts. */
  salt: string;
  now?: () => Date;
}

export class AnalyticsService {
  private readonly now: () => Date;

  constructor(
    private readonly clicks: ClickRepository,
    private readonly options: AnalyticsServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async recordClick(shortUrl: ShortUrl, visit: VisitContext): Promise<void> {
    const occurredAt = this.now();
    const day = toDay(occurredAt);
    const userAgent = parseUserAgent(visit.userAgent);

    await this.clicks.record({
      shortUrlId: shortUrl.id,
      occurredAt,
      day,
      country: visit.ip ? await this.options.geo.countryOf(visit.ip) : null,
      ...userAgent,
      referrerHost: referrerHost(visit.referrer),
      visitorId: visitorId(this.options.salt, day, visit.ip, visit.userAgent),
    });
  }

  leaderboard(
    range: LeaderboardRange,
    limit = 10,
  ): Promise<LeaderboardEntry[]> {
    return buildLeaderboard(this.clicks, range, this.now(), limit);
  }

  /** Stats with a continuous `byDay` series (zero-filled) for the last `days` days. */
  async statsFor(shortUrl: ShortUrl, { days = 30 } = {}): Promise<ClickStats> {
    const series = lastNDays(this.now(), days);
    const stats = await this.clicks.statsFor(shortUrl.id, {
      sinceDay: series[0],
    });

    const counts = new Map(stats.byDay.map((d) => [d.day, d.count]));
    const byDay: DayCount[] = series.map((day) => ({
      day,
      count: counts.get(day) ?? 0,
    }));

    return { ...stats, byDay };
  }
}

/**
 * Abuse guards: only public links (owners opt in), ranked by unique visitors
 * rather than raw clicks, and only once a link is an hour old, so a fresh
 * spam link can't bot its way straight to the top before an admin sees it.
 */
async function buildLeaderboard(
  clicks: ClickRepository,
  range: LeaderboardRange,
  now: Date,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const rows = await clicks.leaderboard({
    sinceDay:
      range === "week" ? toDay(new Date(now.getTime() - 6 * DAY_MS)) : null,
    createdBefore: new Date(now.getTime() - HOUR_MS),
    limit,
  });
  return rows.map((row, i) => ({
    rank: i + 1,
    code: row.code,
    targetDomain: domainOf(row.targetUrl),
    uniqueVisitors: row.uniqueVisitors,
  }));
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function lastNDays(now: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) =>
    toDay(new Date(now.getTime() - (days - 1 - i) * DAY_MS)),
  );
}

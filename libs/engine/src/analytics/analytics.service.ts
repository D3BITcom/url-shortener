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

function lastNDays(now: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) =>
    toDay(new Date(now.getTime() - (days - 1 - i) * DAY_MS)),
  );
}

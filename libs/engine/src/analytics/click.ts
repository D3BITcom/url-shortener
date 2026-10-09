export type DeviceType = "desktop" | "mobile" | "tablet" | "other";

/**
 * One redirect, stored as an event so new breakdowns are just new queries.
 * Raw IPs are never stored: only the country and a daily-rotating visitor hash.
 */
export interface NewClick {
  shortUrlId: string;
  occurredAt: Date;
  /** UTC "YYYY-MM-DD". Stored so per-day grouping is a portable GROUP BY. */
  day: string;
  /** ISO 3166-1 alpha-2, or null when unknown (e.g. private IPs). */
  country: string | null;
  browser: string | null;
  os: string | null;
  device: DeviceType;
  referrerHost: string | null;
  visitorId: string;
  isBot: boolean;
}

export interface CountByKey {
  /** null means "unknown" (no referrer, no geo match, ...). */
  key: string | null;
  count: number;
}

export interface DayCount {
  day: string;
  count: number;
}

/** All counts exclude bot traffic, except `botClicks`. */
export interface ClickStats {
  totalClicks: number;
  uniqueVisitors: number;
  botClicks: number;
  byDay: DayCount[];
  byCountry: CountByKey[];
  byBrowser: CountByKey[];
  byOs: CountByKey[];
  byDevice: CountByKey[];
  byReferrer: CountByKey[];
}

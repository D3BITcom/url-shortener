export {
  DomainError,
  DuplicateShortCodeError,
  InvalidUrlError,
} from "./shared/errors";

export type { ShortUrl, ShortUrlSummary } from "./short-url/short-url";
export type { ShortUrlRepository } from "./short-url/short-url.repository";
export {
  generateShortCode,
  isWellFormedShortCode,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  type ShortCodeGenerator,
} from "./short-url/short-code";
export { MAX_URL_LENGTH, normalizeTargetUrl } from "./short-url/target-url";
export {
  ShortUrlService,
  type ShortenResult,
  type ShortUrlServiceOptions,
} from "./short-url/short-url.service";

export type {
  ClickStats,
  CountByKey,
  DayCount,
  DeviceType,
  NewClick,
} from "./analytics/click";
export type { ClickRepository } from "./analytics/click.repository";
export { NullGeoResolver, type GeoResolver } from "./analytics/geo-resolver";
export { type VisitContext } from "./analytics/visit";
export {
  AnalyticsService,
  type AnalyticsServiceOptions,
} from "./analytics/analytics.service";

export {
  FixedWindowRateLimiter,
  type RateLimitDecision,
} from "./security/rate-limiter";

export {
  DomainError,
  DuplicateShortCodeError,
  InvalidSlugError,
  InvalidUrlError,
  ShortUrlNotFoundError,
  SlugLimitError,
  SlugLockedError,
  SlugTakenError,
} from "./shared/errors";

export type { ShortUrl, ShortUrlSummary } from "./short-url/short-url";
export type {
  ListOptions,
  NewShortUrl,
  ShortUrlPatch,
  ShortUrlRepository,
} from "./short-url/short-url.repository";
export {
  codeKey,
  CUSTOM_SLUG_MAX,
  CUSTOM_SLUG_MIN,
  generateShortCode,
  isWellFormedShortCode,
  RESERVED_SLUGS,
  SHORT_CODE_ALPHABET,
  SHORT_CODE_LENGTH,
  validateCustomSlug,
  type ShortCodeGenerator,
} from "./short-url/short-code";
export { MAX_URL_LENGTH, normalizeTargetUrl } from "./short-url/target-url";
export {
  ANONYMOUS,
  canViewStats,
  isOwner,
  type Viewer,
} from "./short-url/access";
export {
  MAX_CUSTOM_SLUGS_PER_OWNER,
  ShortUrlService,
  type ShortenInput,
  type ShortUrlServiceOptions,
  type ViewableShortUrl,
} from "./short-url/short-url.service";

export {
  generateOwnerSecret,
  hashOwnerSecret,
  isWellFormedOwnerSecret,
  type Owner,
  type OwnerRepository,
} from "./owner/owner";
export { OwnerService, type OwnerSession } from "./owner/owner.service";

export type {
  ClickStats,
  CountByKey,
  DayCount,
  DeviceType,
  LeaderboardRow,
  NewClick,
} from "./analytics/click";
export type { ClickRepository } from "./analytics/click.repository";
export { NullGeoResolver, type GeoResolver } from "./analytics/geo-resolver";
export { type VisitContext } from "./analytics/visit";
export {
  AnalyticsService,
  type AnalyticsServiceOptions,
  type LeaderboardEntry,
  type LeaderboardRange,
} from "./analytics/analytics.service";

export {
  FixedWindowRateLimiter,
  type RateLimitDecision,
} from "./security/rate-limiter";
export {
  DisabledHumanVerifier,
  type HumanVerifier,
} from "./security/human-verifier";

import type { ShortUrl, ShortUrlSummary } from "./short-url";

/**
 * Persistence port for short URLs. The domain depends on this interface only;
 * the Prisma implementation lives in `@url-shortener/database`.
 */
export interface ShortUrlRepository {
  /** @throws DuplicateShortCodeError when `code` is already taken. */
  create(input: { code: string; targetUrl: string }): Promise<ShortUrl>;
  findByCode(code: string): Promise<ShortUrl | null>;
  findByTargetUrl(targetUrl: string): Promise<ShortUrl | null>;
  /** Newest first. Click counts exclude bots. */
  listSummaries(options: { limit: number }): Promise<ShortUrlSummary[]>;
}

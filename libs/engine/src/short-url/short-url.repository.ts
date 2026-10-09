import type { ShortUrl, ShortUrlSummary } from "./short-url";

export interface NewShortUrl {
  code: string;
  targetUrl: string;
  ownerId: string;
  isPublic: boolean;
  isCustomSlug: boolean;
}

export interface ShortUrlPatch {
  code?: string;
  isCustomSlug?: boolean;
  isPublic?: boolean;
  hiddenAt?: Date | null;
}

export interface ListOptions {
  limit: number;
  ownerId?: string;
  /** Matches code or target URL (admin search). */
  search?: string;
}

/**
 * Persistence port for short URLs. The domain depends on this interface only;
 * the Prisma implementation lives in `@url-shortener/database`.
 *
 * Codes are unique ignoring case, and `findByCode` ignores case too.
 */
export interface ShortUrlRepository {
  /** @throws DuplicateShortCodeError when the code is already taken (ignoring case). */
  create(input: NewShortUrl): Promise<ShortUrl>;
  findByCode(code: string): Promise<ShortUrl | null>;
  findSummaryByCode(code: string): Promise<ShortUrlSummary | null>;
  /** Newest first. Click counts exclude bots. */
  listSummaries(options: ListOptions): Promise<ShortUrlSummary[]>;
  countCustomSlugs(ownerId: string): Promise<number>;
  /** @throws DuplicateShortCodeError when renaming to a taken code. */
  update(id: string, patch: ShortUrlPatch): Promise<ShortUrl>;
  /** Deletes the link and its clicks. */
  delete(id: string): Promise<void>;
}

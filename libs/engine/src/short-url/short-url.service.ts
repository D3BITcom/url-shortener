import { DuplicateShortCodeError } from "../shared/errors";
import type { ShortUrl, ShortUrlSummary } from "./short-url";
import type { ShortUrlRepository } from "./short-url.repository";
import {
  generateShortCode,
  isWellFormedShortCode,
  type ShortCodeGenerator,
} from "./short-code";
import { normalizeTargetUrl, type TargetUrlPolicy } from "./target-url";

export interface ShortUrlServiceOptions extends TargetUrlPolicy {
  generateCode?: ShortCodeGenerator;
  /** How many fresh codes to try before giving up on a collision streak. */
  maxCodeAttempts?: number;
}

export interface ShortenResult {
  shortUrl: ShortUrl;
  /** false when an existing link for the same URL was reused. */
  created: boolean;
}

export class ShortUrlService {
  private readonly generateCode: ShortCodeGenerator;
  private readonly maxCodeAttempts: number;

  constructor(
    private readonly repository: ShortUrlRepository,
    private readonly options: ShortUrlServiceOptions = {},
  ) {
    this.generateCode = options.generateCode ?? (() => generateShortCode());
    this.maxCodeAttempts = options.maxCodeAttempts ?? 5;
  }

  /** @throws InvalidUrlError for input that can't be shortened. */
  async shorten(rawUrl: string): Promise<ShortenResult> {
    const targetUrl = normalizeTargetUrl(rawUrl, this.options);

    // There are no user accounts, so the same URL always gets the same link.
    // This keeps repeated submissions from filling the table.
    const existing = await this.repository.findByTargetUrl(targetUrl);
    if (existing) {
      return { shortUrl: existing, created: false };
    }

    // The database's unique constraint is the single source of truth for
    // collisions: no check-then-insert race, so just retry with a new code.
    for (let attempt = 1; attempt <= this.maxCodeAttempts; attempt++) {
      try {
        const shortUrl = await this.repository.create({
          code: this.generateCode(),
          targetUrl,
        });
        return { shortUrl, created: true };
      } catch (error) {
        if (!(error instanceof DuplicateShortCodeError)) throw error;
      }
    }

    throw new Error(
      `Could not generate a unique short code after ${this.maxCodeAttempts} attempts`,
    );
  }

  async resolve(code: string): Promise<ShortUrl | null> {
    if (!isWellFormedShortCode(code)) return null;
    return this.repository.findByCode(code);
  }

  async list(limit = 100): Promise<ShortUrlSummary[]> {
    return this.repository.listSummaries({ limit });
  }
}

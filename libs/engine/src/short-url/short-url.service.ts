import {
  DomainError,
  DuplicateShortCodeError,
  ShortUrlNotFoundError,
  SlugLimitError,
  SlugLockedError,
  SlugTakenError,
} from "../shared/errors";
import { canViewStats, isOwner, type Viewer } from "./access";
import {
  generateShortCode,
  isWellFormedShortCode,
  validateCustomSlug,
  type ShortCodeGenerator,
} from "./short-code";
import type { ShortUrl, ShortUrlSummary } from "./short-url";
import type { ShortUrlRepository } from "./short-url.repository";
import { normalizeTargetUrl, type TargetUrlPolicy } from "./target-url";

export const MAX_CUSTOM_SLUGS_PER_OWNER = 20;

export interface ShortUrlServiceOptions extends TargetUrlPolicy {
  generateCode?: ShortCodeGenerator;
  /** How many fresh codes to try before giving up on a collision streak. */
  maxCodeAttempts?: number;
}

export interface ShortenInput {
  url: string;
  /** Optional custom ending; empty means "generate one". */
  slug?: string;
  isPublic: boolean;
  ownerId: string;
}

export interface ViewableShortUrl {
  shortUrl: ShortUrlSummary;
  /** Owner or admin: may change visibility (and the slug, until the first click). */
  canManage: boolean;
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

  /** @throws InvalidUrlError, InvalidSlugError, SlugTakenError, SlugLimitError */
  async shorten(input: ShortenInput): Promise<ShortUrl> {
    const targetUrl = normalizeTargetUrl(input.url, this.options);
    const base = {
      targetUrl,
      ownerId: input.ownerId,
      isPublic: input.isPublic,
    };

    if (input.slug?.trim()) {
      const code = validateCustomSlug(input.slug);
      await this.assertSlugQuota(input.ownerId);
      try {
        return await this.repository.create({
          ...base,
          code,
          isCustomSlug: true,
        });
      } catch (error) {
        throw error instanceof DuplicateShortCodeError
          ? new SlugTakenError()
          : error;
      }
    }

    // The database's unique constraint is the single source of truth for
    // collisions: no check-then-insert race, so just retry with a new code.
    for (let attempt = 1; attempt <= this.maxCodeAttempts; attempt++) {
      try {
        return await this.repository.create({
          ...base,
          code: this.generateCode(),
          isCustomSlug: false,
        });
      } catch (error) {
        if (!(error instanceof DuplicateShortCodeError)) throw error;
      }
    }

    throw new Error(
      `Could not generate a unique short code after ${this.maxCodeAttempts} attempts`,
    );
  }

  /** For redirects. Hidden links still redirect; only deleted ones don't. */
  async resolve(code: string): Promise<ShortUrl | null> {
    if (!isWellFormedShortCode(code)) return null;
    return this.repository.findByCode(code);
  }

  /**
   * A link the viewer may see. Links they can't see are reported as not found,
   * so private links don't reveal that they exist.
   */
  async getForViewer(code: string, viewer: Viewer): Promise<ViewableShortUrl> {
    const shortUrl = isWellFormedShortCode(code)
      ? await this.repository.findSummaryByCode(code)
      : null;
    if (!shortUrl || !canViewStats(shortUrl, viewer)) {
      throw new ShortUrlNotFoundError();
    }
    return {
      shortUrl,
      canManage: viewer.isAdmin || isOwner(shortUrl, viewer),
    };
  }

  listForOwner(ownerId: string, limit = 200): Promise<ShortUrlSummary[]> {
    return this.repository.listSummaries({ ownerId, limit });
  }

  async setVisibility(
    code: string,
    viewer: Viewer,
    isPublic: boolean,
  ): Promise<ShortUrl> {
    const shortUrl = await this.findManageable(code, viewer);
    return this.repository.update(shortUrl.id, { isPublic });
  }

  /**
   * Allowed only until the first human click: after that, people may already
   * have the old link, and renaming would break it for them.
   */
  async changeSlug(
    code: string,
    viewer: Viewer,
    newSlug: string,
  ): Promise<ShortUrl> {
    const shortUrl = await this.findManageable(code, viewer);
    if (shortUrl.clickCount > 0) throw new SlugLockedError();

    const slug = validateCustomSlug(newSlug);
    if (!shortUrl.isCustomSlug && shortUrl.ownerId) {
      await this.assertSlugQuota(shortUrl.ownerId);
    }
    try {
      return await this.repository.update(shortUrl.id, {
        code: slug,
        isCustomSlug: true,
      });
    } catch (error) {
      throw error instanceof DuplicateShortCodeError
        ? new SlugTakenError()
        : error;
    }
  }

  // --- Admin -------------------------------------------------------------

  async listAll(
    viewer: Viewer,
    options: { search?: string; limit?: number } = {},
  ) {
    assertAdmin(viewer);
    return this.repository.listSummaries({
      limit: options.limit ?? 200,
      search: options.search?.trim() || undefined,
    });
  }

  async setHidden(
    code: string,
    viewer: Viewer,
    hidden: boolean,
  ): Promise<ShortUrl> {
    assertAdmin(viewer);
    const shortUrl = await this.findManageable(code, viewer);
    return this.repository.update(shortUrl.id, {
      hiddenAt: hidden ? new Date() : null,
    });
  }

  async delete(code: string, viewer: Viewer): Promise<void> {
    const shortUrl = await this.findManageable(code, viewer);
    await this.repository.delete(shortUrl.id);
  }

  // ------------------------------------------------------------------------

  private async findManageable(
    code: string,
    viewer: Viewer,
  ): Promise<ShortUrlSummary> {
    const { shortUrl, canManage } = await this.getForViewer(code, viewer);
    if (!canManage) throw new ShortUrlNotFoundError();
    return shortUrl;
  }

  private async assertSlugQuota(ownerId: string): Promise<void> {
    const count = await this.repository.countCustomSlugs(ownerId);
    if (count >= MAX_CUSTOM_SLUGS_PER_OWNER) {
      throw new SlugLimitError(MAX_CUSTOM_SLUGS_PER_OWNER);
    }
  }
}

class NotAdminError extends DomainError {
  readonly code = "FORBIDDEN";
}

function assertAdmin(viewer: Viewer): void {
  // Same message as not-found on purpose: don't advertise the admin surface.
  if (!viewer.isAdmin) throw new NotAdminError("Link not found.");
}

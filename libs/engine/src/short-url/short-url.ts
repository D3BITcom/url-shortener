export interface ShortUrl {
  id: string;
  /** As displayed and as created, e.g. "ShOrTUr1". Lookups ignore case. */
  code: string;
  targetUrl: string;
  createdAt: Date;
  /** null only for links created before ownership existed. */
  ownerId: string | null;
  /** Public links show their stats to everyone and can appear on the leaderboard. */
  isPublic: boolean;
  isCustomSlug: boolean;
  /** Set by an admin: still redirects, but leaves the leaderboard and public stats. */
  hiddenAt: Date | null;
}

/** Read model for lists: a short URL plus its headline numbers. */
export interface ShortUrlSummary extends ShortUrl {
  clickCount: number;
  lastClickedAt: Date | null;
}

export interface ShortUrl {
  id: string;
  code: string;
  targetUrl: string;
  createdAt: Date;
}

/** Read model for the links list: a short URL plus its headline numbers. */
export interface ShortUrlSummary extends ShortUrl {
  clickCount: number;
  lastClickedAt: Date | null;
}

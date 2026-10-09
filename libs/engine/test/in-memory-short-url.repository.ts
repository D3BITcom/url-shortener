import {
  DuplicateShortCodeError,
  type ShortUrl,
  type ShortUrlRepository,
  type ShortUrlSummary,
} from "../src";

/** Test double that honours the repository contract (incl. unique codes). */
export class InMemoryShortUrlRepository implements ShortUrlRepository {
  readonly rows: ShortUrl[] = [];
  createCalls = 0;
  findByCodeCalls = 0;

  async create(input: { code: string; targetUrl: string }): Promise<ShortUrl> {
    this.createCalls++;
    if (this.rows.some((r) => r.code === input.code)) {
      throw new DuplicateShortCodeError(input.code);
    }
    const row = {
      id: `id-${this.rows.length + 1}`,
      createdAt: new Date(),
      ...input,
    };
    this.rows.push(row);
    return row;
  }

  async findByCode(code: string): Promise<ShortUrl | null> {
    this.findByCodeCalls++;
    return this.rows.find((r) => r.code === code) ?? null;
  }

  async findByTargetUrl(targetUrl: string): Promise<ShortUrl | null> {
    return this.rows.find((r) => r.targetUrl === targetUrl) ?? null;
  }

  async listSummaries({
    limit,
  }: {
    limit: number;
  }): Promise<ShortUrlSummary[]> {
    return this.rows
      .slice(-limit)
      .reverse()
      .map((r) => ({ ...r, clickCount: 0, lastClickedAt: null }));
  }
}

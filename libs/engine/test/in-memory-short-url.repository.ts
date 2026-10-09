import {
  codeKey,
  DuplicateShortCodeError,
  type ListOptions,
  type NewShortUrl,
  type ShortUrl,
  type ShortUrlPatch,
  type ShortUrlRepository,
  type ShortUrlSummary,
} from "../src";

/** Test double that honours the repository contract (incl. case-insensitive unique codes). */
export class InMemoryShortUrlRepository implements ShortUrlRepository {
  readonly rows: ShortUrl[] = [];
  /** Human click counts by link id; tests set these directly. */
  readonly clickCounts = new Map<string, number>();
  createCalls = 0;
  findCalls = 0;

  async create(input: NewShortUrl): Promise<ShortUrl> {
    this.createCalls++;
    this.assertFree(input.code);
    const row: ShortUrl = {
      id: `id-${this.rows.length + 1}`,
      createdAt: new Date(),
      hiddenAt: null,
      ...input,
    };
    this.rows.push(row);
    return row;
  }

  async findByCode(code: string): Promise<ShortUrl | null> {
    this.findCalls++;
    return this.rows.find((r) => codeKey(r.code) === codeKey(code)) ?? null;
  }

  async findSummaryByCode(code: string): Promise<ShortUrlSummary | null> {
    const row = await this.findByCode(code);
    return row ? this.summarize(row) : null;
  }

  async listSummaries(options: ListOptions): Promise<ShortUrlSummary[]> {
    return this.rows
      .filter((r) => !options.ownerId || r.ownerId === options.ownerId)
      .filter(
        (r) =>
          !options.search ||
          r.code.includes(options.search) ||
          r.targetUrl.includes(options.search),
      )
      .slice(-options.limit)
      .reverse()
      .map((r) => this.summarize(r));
  }

  async countCustomSlugs(ownerId: string): Promise<number> {
    return this.rows.filter((r) => r.ownerId === ownerId && r.isCustomSlug)
      .length;
  }

  async update(id: string, patch: ShortUrlPatch): Promise<ShortUrl> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`no row ${id}`);
    if (patch.code !== undefined) this.assertFree(patch.code, id);
    Object.assign(row, patch);
    return row;
  }

  async delete(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index >= 0) this.rows.splice(index, 1);
  }

  private assertFree(code: string, exceptId?: string): void {
    if (
      this.rows.some(
        (r) => r.id !== exceptId && codeKey(r.code) === codeKey(code),
      )
    ) {
      throw new DuplicateShortCodeError(code);
    }
  }

  private summarize(row: ShortUrl): ShortUrlSummary {
    return {
      ...row,
      clickCount: this.clickCounts.get(row.id) ?? 0,
      lastClickedAt: null,
    };
  }
}

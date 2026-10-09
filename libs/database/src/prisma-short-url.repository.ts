import {
  codeKey,
  DuplicateShortCodeError,
  type ListOptions,
  type NewShortUrl,
  type ShortUrl,
  type ShortUrlPatch,
  type ShortUrlRepository,
  type ShortUrlSummary,
} from "@url-shortener/engine";
import { Prisma, type PrismaClient } from "./generated/prisma/client";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
const HUMAN_CLICKS = { isBot: false };

/** Adds the headline numbers to a query (bots excluded). */
const SUMMARY_INCLUDE = {
  _count: { select: { clicks: { where: HUMAN_CLICKS } } },
  clicks: {
    where: HUMAN_CLICKS,
    orderBy: { occurredAt: "desc" },
    take: 1,
    select: { occurredAt: true },
  },
} satisfies Prisma.ShortUrlInclude;

type ShortUrlRow = Prisma.ShortUrlGetPayload<object>;
type SummaryRow = Prisma.ShortUrlGetPayload<{
  include: typeof SUMMARY_INCLUDE;
}>;

export class PrismaShortUrlRepository implements ShortUrlRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewShortUrl): Promise<ShortUrl> {
    return toShortUrl(
      await this.mapDuplicate(input.code, () =>
        this.prisma.shortUrl.create({
          data: { ...input, codeKey: codeKey(input.code) },
        }),
      ),
    );
  }

  async findByCode(code: string): Promise<ShortUrl | null> {
    const row = await this.prisma.shortUrl.findUnique({
      where: { codeKey: codeKey(code) },
    });
    return row ? toShortUrl(row) : null;
  }

  async findSummaryByCode(code: string): Promise<ShortUrlSummary | null> {
    const row = await this.prisma.shortUrl.findUnique({
      where: { codeKey: codeKey(code) },
      include: SUMMARY_INCLUDE,
    });
    return row ? toSummary(row) : null;
  }

  async listSummaries({
    limit,
    ownerId,
    search,
  }: ListOptions): Promise<ShortUrlSummary[]> {
    const rows = await this.prisma.shortUrl.findMany({
      where: {
        ownerId,
        ...(search && {
          OR: [
            { code: { contains: search } },
            { targetUrl: { contains: search } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: SUMMARY_INCLUDE,
    });
    return rows.map(toSummary);
  }

  countCustomSlugs(ownerId: string): Promise<number> {
    return this.prisma.shortUrl.count({
      where: { ownerId, isCustomSlug: true },
    });
  }

  async update(id: string, patch: ShortUrlPatch): Promise<ShortUrl> {
    const data = patch.code
      ? { ...patch, codeKey: codeKey(patch.code) }
      : patch;
    return toShortUrl(
      await this.mapDuplicate(patch.code ?? "", () =>
        this.prisma.shortUrl.update({ where: { id }, data }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    // Clicks go with it (onDelete: Cascade).
    await this.prisma.shortUrl.delete({ where: { id } });
  }

  private async mapDuplicate<T>(
    code: string,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new DuplicateShortCodeError(code);
      }
      throw error;
    }
  }
}

/** Drops persistence-only columns (codeKey) so they never leak into the domain. */
function toShortUrl({ codeKey: _codeKey, ...row }: ShortUrlRow): ShortUrl {
  return row;
}

function toSummary({ _count, clicks, ...row }: SummaryRow): ShortUrlSummary {
  return {
    ...toShortUrl(row),
    clickCount: _count.clicks,
    lastClickedAt: clicks[0]?.occurredAt ?? null,
  };
}

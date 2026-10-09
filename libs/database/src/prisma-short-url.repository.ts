import {
  DuplicateShortCodeError,
  type ShortUrl,
  type ShortUrlRepository,
  type ShortUrlSummary,
} from "@url-shortener/engine";
import { Prisma, type PrismaClient } from "./generated/prisma/client";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export class PrismaShortUrlRepository implements ShortUrlRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { code: string; targetUrl: string }): Promise<ShortUrl> {
    try {
      return await this.prisma.shortUrl.create({ data: input });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new DuplicateShortCodeError(input.code);
      }
      throw error;
    }
  }

  findByCode(code: string): Promise<ShortUrl | null> {
    return this.prisma.shortUrl.findUnique({ where: { code } });
  }

  findByTargetUrl(targetUrl: string): Promise<ShortUrl | null> {
    return this.prisma.shortUrl.findFirst({
      where: { targetUrl },
      orderBy: { createdAt: "asc" },
    });
  }

  async listSummaries({
    limit,
  }: {
    limit: number;
  }): Promise<ShortUrlSummary[]> {
    const humanClicks = { isBot: false };
    const rows = await this.prisma.shortUrl.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        _count: { select: { clicks: { where: humanClicks } } },
        clicks: {
          where: humanClicks,
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });

    return rows.map(({ _count, clicks, ...shortUrl }) => ({
      ...shortUrl,
      clickCount: _count.clicks,
      lastClickedAt: clicks[0]?.occurredAt ?? null,
    }));
  }
}

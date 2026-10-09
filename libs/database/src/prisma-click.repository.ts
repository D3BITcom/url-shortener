import type {
  ClickRepository,
  ClickStats,
  CountByKey,
  LeaderboardRow,
  NewClick,
} from "@url-shortener/engine";
import type { PrismaClient } from "./generated/prisma/client";

type BreakdownField = "country" | "browser" | "os" | "device" | "referrerHost";

const TOP_N = 10;

export class PrismaClickRepository implements ClickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(click: NewClick): Promise<void> {
    await this.prisma.click.create({ data: click });
  }

  async statsFor(
    shortUrlId: string,
    { sinceDay }: { sinceDay: string },
  ): Promise<ClickStats> {
    const human = { shortUrlId, isBot: false };

    const [
      totalClicks,
      botClicks,
      visitors,
      days,
      byCountry,
      byBrowser,
      byOs,
      byDevice,
      byReferrer,
    ] = await Promise.all([
      this.prisma.click.count({ where: human }),
      this.prisma.click.count({ where: { shortUrlId, isBot: true } }),
      // Prisma has no COUNT(DISTINCT); grouping is the portable equivalent.
      // Fine at this scale; a per-day rollup table would replace it at volume.
      this.prisma.click.groupBy({ by: ["visitorId"], where: human }),
      this.prisma.click.groupBy({
        by: ["day"],
        where: { ...human, day: { gte: sinceDay } },
        _count: { _all: true },
        orderBy: { day: "asc" },
      }),
      this.topBy(shortUrlId, "country"),
      this.topBy(shortUrlId, "browser"),
      this.topBy(shortUrlId, "os"),
      this.topBy(shortUrlId, "device"),
      this.topBy(shortUrlId, "referrerHost"),
    ]);

    return {
      totalClicks,
      uniqueVisitors: visitors.length,
      botClicks,
      byDay: days.map((d) => ({ day: d.day, count: d._count._all })),
      byCountry,
      byBrowser,
      byOs,
      byDevice,
      byReferrer,
    };
  }

  /**
   * Portable two-step query instead of raw SQL (whose date/boolean encoding
   * differs per driver): eligible links, then their distinct (link, visitor)
   * pairs. Fine for this scale; a daily rollup table would replace it at volume.
   */
  async leaderboard({
    sinceDay,
    createdBefore,
    limit,
  }: {
    sinceDay: string | null;
    createdBefore: Date;
    limit: number;
  }): Promise<LeaderboardRow[]> {
    const candidates = await this.prisma.shortUrl.findMany({
      where: {
        isPublic: true,
        hiddenAt: null,
        createdAt: { lt: createdBefore },
      },
      select: { id: true, code: true, targetUrl: true, createdAt: true },
    });
    if (candidates.length === 0) return [];

    const pairs = await this.prisma.click.groupBy({
      by: ["shortUrlId", "visitorId"],
      where: {
        shortUrlId: { in: candidates.map((c) => c.id) },
        isBot: false,
        ...(sinceDay && { day: { gte: sinceDay } }),
      },
    });

    const visitors = new Map<string, number>();
    for (const pair of pairs) {
      visitors.set(pair.shortUrlId, (visitors.get(pair.shortUrlId) ?? 0) + 1);
    }

    return (
      candidates
        .map((c) => ({ ...c, uniqueVisitors: visitors.get(c.id) ?? 0 }))
        .filter((c) => c.uniqueVisitors > 0)
        // Ties go to the older link: it got there first.
        .sort(
          (a, b) =>
            b.uniqueVisitors - a.uniqueVisitors ||
            a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .slice(0, limit)
        .map(({ code, targetUrl, uniqueVisitors }) => ({
          code,
          targetUrl,
          uniqueVisitors,
        }))
    );
  }

  private async topBy(
    shortUrlId: string,
    field: BreakdownField,
  ): Promise<CountByKey[]> {
    const rows = await this.prisma.click.groupBy({
      by: [field],
      where: { shortUrlId, isBot: false },
      _count: { _all: true },
      // Count `id` (never null) so the "unknown" bucket sorts by its real size.
      orderBy: { _count: { id: "desc" } },
      take: TOP_N,
    });

    return rows.map((row) => ({
      key: row[field] ?? null,
      count: row._count._all,
    }));
  }
}

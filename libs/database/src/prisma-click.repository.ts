import type {
  ClickRepository,
  ClickStats,
  CountByKey,
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

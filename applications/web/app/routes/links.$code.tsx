import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { getContainer } from "~/.server/container";
import { CopyButton } from "~/components/copy-button";
import { BreakdownCard, ClicksChart, StatCard } from "~/components/stats";
import { Button } from "~/components/ui/button";
import {
  displayUrl,
  formatCountry,
  formatNumber,
  formatRelative,
} from "~/lib/format";
import type { Route } from "./+types/links.$code";

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  other: "Other",
};

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: data
        ? `Stats for /s/${data.link.code} · URL Shortener`
        : "Not found",
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { shortUrls, analytics, shortLinkFor } = await getContainer();
  const shortUrl = await shortUrls.resolve(params.code);
  if (!shortUrl) {
    throw new Response("Link not found", { status: 404 });
  }

  return {
    now: new Date(),
    link: {
      code: shortUrl.code,
      shortLink: shortLinkFor(shortUrl.code),
      targetUrl: shortUrl.targetUrl,
      createdAt: shortUrl.createdAt,
    },
    stats: await analytics.statsFor(shortUrl, { days: 30 }),
  };
}

export default function LinkStats({ loaderData }: Route.ComponentProps) {
  const { link, stats, now } = loaderData;
  const topCountry = stats.byCountry.find((c) => c.key !== null);

  return (
    <div className="flex flex-col gap-6 py-8">
      <Button asChild variant="link" className="self-start px-0">
        <Link to="/links">
          <ArrowLeft aria-hidden />
          All links
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {displayUrl(link.shortLink)}
          </h1>
          <a
            href={link.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
            title={link.targetUrl}
          >
            <span className="truncate">{link.targetUrl}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
          <p className="mt-1 text-xs text-muted-foreground">
            Created {formatRelative(link.createdAt, now)}
          </p>
        </div>
        <CopyButton value={link.shortLink} label="Copy link" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total clicks"
          value={formatNumber(stats.totalClicks)}
        />
        <StatCard
          label="Unique visitors"
          value={formatNumber(stats.uniqueVisitors)}
          hint="Counted once per day"
        />
        <StatCard
          label="Top country"
          value={topCountry ? formatCountry(topCountry.key) : "—"}
        />
        <StatCard
          label="Bot clicks filtered"
          value={formatNumber(stats.botClicks)}
          hint="Link previews, crawlers"
        />
      </div>

      <ClicksChart data={stats.byDay} />

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard
          title="Countries"
          rows={stats.byCountry}
          formatKey={formatCountry}
        />
        <BreakdownCard
          title="Referrers"
          rows={stats.byReferrer}
          formatKey={(key) => key ?? "Direct / none"}
        />
        <BreakdownCard title="Browsers" rows={stats.byBrowser} />
        <BreakdownCard title="Operating systems" rows={stats.byOs} />
        <BreakdownCard
          title="Devices"
          rows={stats.byDevice}
          formatKey={(key) => (key ? (DEVICE_LABELS[key] ?? key) : "Unknown")}
        />
      </div>
    </div>
  );
}

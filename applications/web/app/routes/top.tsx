import type { LeaderboardRange } from "@url-shortener/engine";
import { Link, useLoaderData } from "react-router";
import { getContainer } from "~/.server/container";
import { Notice } from "~/components/ui/alert";
import { Counter } from "~/components/ui/counter";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/top";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Hall of Fame ~ d3b.it/r" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const container = await getContainer();
  const range: LeaderboardRange =
    new URL(request.url).searchParams.get("range") === "all" ? "all" : "week";
  const entries = await container.analytics.leaderboard(range);

  return {
    range,
    entries: entries.map((e) => ({
      ...e,
      shortLink: container.shortLinkFor(e.code).replace(/^https?:\/\//, ""),
    })),
  };
}

const RANK_COLORS = ["bg-[#facc15]", "bg-[#e2e8f0]", "bg-[#fb923c]"];

export default function Leaderboard() {
  const { range, entries } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-7">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <h1 className="wavy -rotate-1 border-4 border-ink bg-paper px-5 py-1.5 text-4xl font-bold text-fuchsia italic shadow-hard-lg sm:text-5xl">
          ~ Hall of Fame ~
        </h1>
        <p className="border-2 border-ink bg-white px-3 py-1 text-sm">
          The most-visited public links. Ranked by unique visitors.
        </p>
      </div>

      {/* Plain links, not JS tabs: shareable URLs, works without JavaScript. */}
      <nav aria-label="Time range" className="flex justify-center">
        {(["week", "all"] as const).map((value, i) => (
          <Link
            key={value}
            to={value === "week" ? "/top" : "/top?range=all"}
            aria-current={range === value ? "page" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center border-[3px] border-ink px-6 text-sm font-bold tracking-wider text-ink uppercase no-underline",
              range === value ? "bg-paper" : "bg-white",
              i > 0 && "border-l-0",
            )}
          >
            {value === "week" ? "This week" : "All time"}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p className="border-[3px] border-ink bg-white px-6 py-12 text-center shadow-hard">
          Nobody here yet. Make a link public and share it!
        </p>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {entries.map((entry) => (
            <li
              key={entry.code}
              className="flex items-center gap-4 border-[3px] border-ink bg-white px-4 py-3 shadow-[5px_5px_0_var(--color-ink)]"
            >
              <span
                className={cn(
                  "flex size-14 flex-none items-center justify-center border-[3px] border-ink font-pixel text-3xl",
                  RANK_COLORS[entry.rank - 1] ?? "bg-white",
                )}
              >
                #{entry.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  to={`/stats/${entry.code}`}
                  className="truncate font-pixel text-3xl leading-tight text-ink"
                >
                  {entry.shortLink}
                </Link>
                <span className="text-[13px]">→ {entry.targetDomain}</span>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <Counter value={entry.uniqueVisitors} className="text-3xl" />
                <span className="text-[11px] tracking-wider">VISITORS</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Notice className="text-center">
        Only links their owners chose to make public. Destinations show the
        domain only. New links appear after one hour.
      </Notice>
    </div>
  );
}

import type { ClickStats, CountByKey, DayCount } from "@url-shortener/engine";
import type { ReactNode } from "react";
import { Counter, Odometer } from "~/components/ui/counter";
import { Window } from "~/components/ui/window";
import { formatCountry, formatDay, formatNumber } from "~/lib/format";
import { cn } from "~/lib/utils";

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  other: "Other",
};

export function StatsTiles({ stats }: { stats: ClickStats }) {
  const topCountry = stats.byCountry.find((c) => c.key !== null);
  const share =
    topCountry && stats.totalClicks
      ? Math.round((topCountry.count / stats.totalClicks) * 100)
      : 0;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
      <section
        aria-label="Total clicks"
        className="flex flex-col gap-2.5 border-4 border-ink bg-ink p-4 text-white shadow-[6px_6px_0_var(--color-pink)]"
      >
        <span className="text-xs tracking-[0.12em] text-lime-soft">
          TOTAL CLICKS
        </span>
        <Odometer value={stats.totalClicks} />
      </section>
      <Tile
        label="Unique visitors"
        value={formatNumber(stats.uniqueVisitors)}
        hint="counted once per day"
      />
      <Tile
        label="Top country"
        value={topCountry?.key ?? "—"}
        hint={
          topCountry
            ? `${formatCountry(topCountry.key)} · ${share}%`
            : "no data yet"
        }
      />
      <Tile
        label="Bots filtered"
        value={formatNumber(stats.botClicks)}
        hint="link previews, crawlers"
        className="bg-peach"
      />
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex flex-col gap-1.5 border-4 border-ink bg-white p-4 shadow-[6px_6px_0_var(--color-ink)]",
        className,
      )}
    >
      <span className="text-xs tracking-[0.12em] uppercase">{label}</span>
      <span className="font-pixel text-5xl leading-none">{value}</span>
      <span className="text-xs">{hint}</span>
    </section>
  );
}

/** Daily clicks as hard-edged bars. One series doesn't need a chart library. */
export function ClicksChart({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Window title={`CLICKS_LAST_${data.length}_DAYS.GIF`}>
      <div className="p-6">
        <div
          role="img"
          aria-label={`${formatNumber(total)} clicks in the last ${data.length} days`}
          className="flex h-48 items-end gap-0.5 border-b-[3px] border-l-[3px] border-ink pl-1 sm:gap-1"
        >
          {data.map((d) => (
            <div
              key={d.day}
              title={`${formatDay(d.day)}: ${formatNumber(d.count)} click${d.count === 1 ? "" : "s"}`}
              className="flex-1 border-2 border-b-0 border-ink bg-pink"
              style={{
                height: d.count
                  ? `${Math.max(4, (d.count / max) * 100)}%`
                  : "3px",
              }}
            />
          ))}
        </div>
        {data.length > 0 && (
          <div className="mt-2 flex justify-between text-xs">
            <span>{formatDay(data[0].day)}</span>
            <span>{formatDay(data[data.length - 1].day)}</span>
          </div>
        )}
      </div>
    </Window>
  );
}

export function Breakdowns({ stats }: { stats: ClickStats }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
      <Breakdown
        title="Countries"
        rows={stats.byCountry}
        format={formatCountry}
      />
      <Breakdown
        title="Referrers"
        rows={stats.byReferrer}
        format={(key) => key ?? "Direct / none"}
      />
      <Breakdown title="Browsers" rows={stats.byBrowser} />
      <Breakdown title="Operating systems" rows={stats.byOs} />
      <Breakdown
        title="Devices"
        rows={stats.byDevice}
        format={(key) => (key ? (DEVICE_LABELS[key] ?? key) : "Unknown")}
      />
    </div>
  );
}

function Breakdown({
  title,
  rows,
  format = (key) => key ?? "Unknown",
}: {
  title: string;
  rows: CountByKey[];
  format?: (key: string | null) => string;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <section className="border-4 border-ink bg-white shadow-[6px_6px_0_var(--color-grape)]">
      <h2 className="border-b-[3px] border-ink bg-paper px-3 py-1.5 text-sm font-bold tracking-widest uppercase">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm">No clicks yet</p>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {rows.map((row) => {
            const share = total ? (row.count / total) * 100 : 0;
            return (
              <li
                key={row.key ?? "unknown"}
                className="flex items-center gap-2.5 text-sm"
              >
                <span
                  className="w-36 flex-none truncate"
                  title={format(row.key)}
                >
                  {format(row.key)}
                </span>
                <span
                  className="h-4 flex-1 border-2 border-ink bg-white"
                  aria-hidden
                >
                  <span
                    className="block h-full bg-cyan"
                    style={{ width: `${share}%` }}
                  />
                </span>
                <Counter
                  value={row.count}
                  className="w-14 flex-none text-right text-xl"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

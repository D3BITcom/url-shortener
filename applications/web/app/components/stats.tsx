import type { CountByKey, DayCount } from "@url-shortener/engine";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDay, formatNumber } from "~/lib/format";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Daily clicks as a bar chart. Plain divs: no chart library needed for one series. */
export function ClicksChart({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clicks, last {data.length} days</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-40 items-end gap-0.5 sm:gap-1"
          role="img"
          aria-label={`${formatNumber(total)} clicks in the last ${data.length} days`}
        >
          {data.map((d) => (
            <div
              key={d.day}
              className="group relative flex h-full flex-1 items-end"
              title={`${formatDay(d.day)}: ${formatNumber(d.count)} click${d.count === 1 ? "" : "s"}`}
            >
              <div
                className="w-full rounded-t-sm bg-primary/80 transition-colors group-hover:bg-primary"
                style={{
                  height: d.count
                    ? `${Math.max(4, (d.count / max) * 100)}%`
                    : "2px",
                }}
              />
            </div>
          ))}
        </div>
        {data.length > 0 && (
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatDay(data[0].day)}</span>
            <span>{formatDay(data[data.length - 1].day)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BreakdownCard({
  title,
  rows,
  formatKey = (key) => key ?? "Unknown",
  emptyLabel = "No data yet",
}: {
  title: string;
  rows: CountByKey[];
  formatKey?: (key: string | null) => string;
  emptyLabel?: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((row) => {
              const share = total ? (row.count / total) * 100 : 0;
              return (
                <li
                  key={row.key ?? "unknown"}
                  className="relative overflow-hidden rounded-md"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-accent"
                    style={{ width: `${share}%` }}
                    aria-hidden
                  />
                  <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
                    <span className="truncate">{formatKey(row.key)}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatNumber(row.count)}
                      <span className="ml-2 inline-block w-9 text-right text-xs">
                        {Math.round(share)}%
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

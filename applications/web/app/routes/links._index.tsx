import { ChevronRight, Link2 } from "lucide-react";
import { Link } from "react-router";
import { getContainer } from "~/.server/container";
import { CopyButton } from "~/components/copy-button";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { displayUrl, formatNumber, formatRelative } from "~/lib/format";
import type { Route } from "./+types/links._index";

const LIST_LIMIT = 100;

export function meta({}: Route.MetaArgs) {
  return [{ title: "Your links · URL Shortener" }];
}

export async function loader() {
  const { shortUrls, shortLinkFor } = await getContainer();
  const summaries = await shortUrls.list(LIST_LIMIT);

  return {
    now: new Date(),
    links: summaries.map((s) => ({
      code: s.code,
      shortLink: shortLinkFor(s.code),
      targetUrl: s.targetUrl,
      clickCount: s.clickCount,
      lastClickedAt: s.lastClickedAt,
      createdAt: s.createdAt,
    })),
  };
}

export default function Links({ loaderData }: Route.ComponentProps) {
  const { links, now } = loaderData;

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
          <p className="text-sm text-muted-foreground">
            The {LIST_LIMIT} most recent links. Click counts exclude bots.
          </p>
        </div>
        <Button asChild>
          <Link to="/">
            <Link2 aria-hidden />
            New link
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        {links.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-medium">No links yet</p>
            <p className="text-sm text-muted-foreground">
              Shorten your first URL and its stats will show up here.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Shorten a URL</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Short link</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>Last click</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.code}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/links/${link.code}`}
                        className="font-medium whitespace-nowrap hover:underline"
                      >
                        {displayUrl(link.shortLink)}
                      </Link>
                      <CopyButton value={link.shortLink} size="icon" />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <span
                      className="block truncate text-muted-foreground"
                      title={link.targetUrl}
                    >
                      {displayUrl(link.targetUrl)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(link.clickCount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {link.lastClickedAt
                      ? formatRelative(link.lastClickedAt, now)
                      : "Never"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatRelative(link.createdAt, now)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/links/${link.code}`}>
                        Stats
                        <ChevronRight aria-hidden />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

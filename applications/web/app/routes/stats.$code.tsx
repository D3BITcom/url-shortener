import { ShortUrlNotFoundError } from "@url-shortener/engine";
import { ExternalLink } from "lucide-react";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getContainer } from "~/.server/container";
import { toUserMessage } from "~/.server/errors";
import { logger } from "~/.server/logger";
import { getViewer } from "~/.server/session";
import { CopyButton } from "~/components/copy-button";
import { Breakdowns, ClicksChart, StatsTiles } from "~/components/stats";
import { ErrorAlert } from "~/components/ui/alert";
import { VisibilityBadge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label, PrefixedInput } from "~/components/ui/input";
import { Window } from "~/components/ui/window";
import { displayUrl, formatRelative } from "~/lib/format";
import type { Route } from "./+types/stats.$code";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data ? `Stats for /r/${data.link.code} ~ d3b.it/r` : "Not found" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const container = await getContainer();
  const { viewer } = await getViewer(request, container);

  try {
    const { shortUrl, canManage } = await container.shortUrls.getForViewer(
      params.code,
      viewer,
    );
    return {
      now: new Date(),
      canManage,
      shortLinkPrefix: container.shortLinkPrefix,
      link: {
        code: shortUrl.code,
        shortLink: container.shortLinkFor(shortUrl.code),
        targetUrl: shortUrl.targetUrl,
        createdAt: shortUrl.createdAt,
        isPublic: shortUrl.isPublic,
        hidden: shortUrl.hiddenAt !== null,
        // Renaming is allowed until the first human click.
        canRename: shortUrl.clickCount === 0,
      },
      stats: await container.analytics.statsFor(shortUrl, { days: 30 }),
    };
  } catch (error) {
    if (error instanceof ShortUrlNotFoundError) {
      throw new Response("Not found", { status: 404 });
    }
    throw error;
  }
}

/** Owner (or admin) actions: visibility, rename, delete. */
export async function action({ request, params }: Route.ActionArgs) {
  const container = await getContainer();
  const { viewer } = await getViewer(request, container);
  const form = await request.formData();
  const intent = form.get("intent");

  try {
    if (intent === "visibility") {
      await container.shortUrls.setVisibility(
        params.code,
        viewer,
        form.get("isPublic") === "true",
      );
      return { error: null };
    }
    if (intent === "rename") {
      const renamed = await container.shortUrls.changeSlug(
        params.code,
        viewer,
        String(form.get("slug") ?? ""),
      );
      logger.info({ from: params.code, to: renamed.code }, "Link renamed");
      return redirect(`/stats/${renamed.code}`);
    }
    if (intent === "delete") {
      await container.shortUrls.delete(params.code, viewer);
      logger.info(
        { code: params.code, byAdmin: viewer.isAdmin },
        "Link deleted",
      );
      return redirect(viewer.isAdmin && !viewer.ownerId ? "/admin" : "/me");
    }
    return data({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return data(
      { error: toUserMessage(error, `stats:${intent}`) },
      { status: 400 },
    );
  }
}

export default function LinkStats() {
  const { link, stats, now, canManage, shortLinkPrefix } =
    useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-7">
      <Link
        to={canManage ? "/me" : "/top"}
        className="self-start border-2 border-ink bg-white px-2.5 py-1 text-sm font-bold text-ink no-underline"
      >
        ← {canManage ? "My links" : "Top 10"}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-5 border-[6px] border-dashed border-grape bg-paper p-6 shadow-hot">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-pixel text-4xl leading-none break-all sm:text-5xl">
            {displayUrl(link.shortLink)}
          </h1>
          <a
            href={link.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm break-all text-ink"
          >
            → {link.targetUrl}
            <ExternalLink className="size-3.5 flex-none" aria-hidden />
          </a>
          <p className="text-[13px]">
            Created {formatRelative(link.createdAt, now)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VisibilityBadge isPublic={link.isPublic} hidden={link.hidden} />
          <CopyButton
            value={link.shortLink}
            label="Copy link"
            variant="white"
          />
        </div>
      </div>

      {canManage && (
        <ManagePanel link={link} shortLinkPrefix={shortLinkPrefix} />
      )}

      <StatsTiles stats={stats} />
      <ClicksChart data={stats.byDay} />
      <Breakdowns stats={stats} />
    </div>
  );
}

function ManagePanel({
  link,
  shortLinkPrefix,
}: {
  link: {
    code: string;
    isPublic: boolean;
    hidden: boolean;
    canRename: boolean;
  };
  shortLinkPrefix: string;
}) {
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";

  return (
    <Window title="MANAGE.EXE" tone="grape">
      <div className="grid gap-6 p-6 md:grid-cols-3">
        <Form method="post" className="flex flex-col gap-3">
          <input type="hidden" name="intent" value="visibility" />
          <input type="hidden" name="isPublic" value={String(!link.isPublic)} />
          <p className="text-sm font-bold tracking-wider uppercase">
            Visibility
          </p>
          <p className="text-sm">
            {link.isPublic
              ? "Public: anyone can see these stats, and it can make the Top 10."
              : "Private: only you can see these stats."}
            {link.hidden && " An admin has hidden it from public pages."}
          </p>
          <Button
            type="submit"
            variant="yellow"
            disabled={busy}
            className="self-start"
          >
            {link.isPublic ? "Make private" : "Make public"}
          </Button>
        </Form>

        <Form method="post" className="flex flex-col gap-3">
          <input type="hidden" name="intent" value="rename" />
          <Label htmlFor="slug">Change ending</Label>
          {link.canRename ? (
            <>
              <PrefixedInput
                prefix={shortLinkPrefix}
                id="slug"
                name="slug"
                required
                minLength={4}
                maxLength={32}
                defaultValue={link.code}
                autoComplete="off"
              />
              <Button
                type="submit"
                variant="white"
                disabled={busy}
                className="self-start"
              >
                Rename
              </Button>
            </>
          ) : (
            <p className="text-sm">
              Locked: this link has been clicked, and renaming it would break it
              for people who already have it.
            </p>
          )}
        </Form>

        <Form
          method="post"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            if (!confirm("Delete this link? It stops working immediately.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <p className="text-sm font-bold tracking-wider uppercase">
            Danger zone
          </p>
          <p className="text-sm">
            Deleting stops the redirect and removes its stats for good.
          </p>
          <Button
            type="submit"
            variant="danger"
            disabled={busy}
            className="self-start"
          >
            Delete link
          </Button>
        </Form>
      </div>
      {result?.error && (
        <ErrorAlert className="m-6 mt-0">{result.error}</ErrorAlert>
      )}
    </Window>
  );
}

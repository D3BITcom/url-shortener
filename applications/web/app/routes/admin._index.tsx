import type { ReactNode } from "react";
import { data, Form, Link, redirect, useLoaderData } from "react-router";
import { getContainer } from "~/.server/container";
import { toUserMessage } from "~/.server/errors";
import { logger } from "~/.server/logger";
import { getViewer } from "~/.server/session";
import { cn } from "~/lib/utils";
import { formatNumber, formatRelative } from "~/lib/format";
import type { Route } from "./+types/admin._index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin ~ d3b.it/r" },
    { name: "robots", content: "noindex" },
  ];
}

async function requireAdmin(request: Request) {
  const container = await getContainer();
  if (!container.adminToken) throw new Response("Not found", { status: 404 });
  const { viewer } = await getViewer(request, container);
  if (!viewer.isAdmin) throw redirect("/admin/login");
  return { container, viewer };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { container, viewer } = await requireAdmin(request);
  const search = new URL(request.url).searchParams.get("q") ?? "";
  const links = await container.shortUrls.listAll(viewer, {
    search,
    limit: 200,
  });

  return {
    search,
    now: new Date(),
    totals: {
      links: links.length,
      clicks: links.reduce((sum, l) => sum + l.clickCount, 0),
      public: links.filter((l) => l.isPublic && !l.hiddenAt).length,
      hidden: links.filter((l) => l.hiddenAt).length,
    },
    links: links.map((l) => ({
      code: l.code,
      targetUrl: l.targetUrl,
      owner: l.ownerId ? `…${l.ownerId.slice(-6)}` : "—",
      isPublic: l.isPublic,
      hidden: l.hiddenAt !== null,
      clickCount: l.clickCount,
      createdAt: l.createdAt,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { container, viewer } = await requireAdmin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const code = String(form.get("code") ?? "");

  if (intent === "logout") {
    return redirect("/", {
      headers: {
        "Set-Cookie": await container.cookies.admin.serialize("", {
          maxAge: 0,
        }),
      },
    });
  }

  try {
    if (intent === "hide" || intent === "unhide") {
      await container.shortUrls.setHidden(code, viewer, intent === "hide");
    } else if (intent === "delete") {
      await container.shortUrls.delete(code, viewer);
    } else {
      return data({ error: "Unknown action." }, { status: 400 });
    }
    logger.info({ intent, code }, "Admin action");
    return { error: null };
  } catch (error) {
    return data(
      { error: toUserMessage(error, `admin:${intent}`) },
      { status: 400 },
    );
  }
}

export default function Admin() {
  const { links, totals, search, now } = useLoaderData<typeof loader>();

  return (
    <div className="bevel-out text-black shadow-[10px_10px_0_var(--color-ink)]">
      <div className="flex items-center justify-between bg-[linear-gradient(90deg,#000080,#1084d0)] px-2 py-1 text-white">
        <h1 className="text-sm font-bold">Admin Console — d3b.it/r</h1>
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <WinButton className="min-h-7 px-2 text-xs">Log out</WinButton>
        </Form>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
          <Total label="Links (shown)" value={totals.links} />
          <Total label="Human clicks" value={totals.clicks} />
          <Total label="On leaderboard" value={totals.public} />
          <Total label="Hidden" value={totals.hidden} />
        </div>

        <Form method="get" className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="q" className="text-sm font-bold">
            Search:
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="slug or destination"
            className="bevel-in h-10 flex-[1_1_280px] bg-white px-2 font-mono text-sm"
          />
          <WinButton>Find</WinButton>
        </Form>

        <div className="bevel-in overflow-x-auto bg-white">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#c0c0c0] text-left">
                {[
                  "Slug",
                  "Destination",
                  "Owner",
                  "Visibility",
                  "Clicks",
                  "Created",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b-2 border-[#404040] px-2.5 py-2"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2.5 py-6 text-center">
                    No links{search && ` matching "${search}"`}.
                  </td>
                </tr>
              )}
              {links.map((link) => (
                <tr
                  key={link.code}
                  className={cn(
                    "border-b border-[#c0c0c0]",
                    link.hidden && "bg-[#fecaca]",
                  )}
                >
                  <td className="px-2.5 py-2 font-bold">
                    <Link to={`/stats/${link.code}`} className="text-[#1e3a8a]">
                      {link.code}
                    </Link>
                  </td>
                  <td
                    className="max-w-64 truncate px-2.5 py-2"
                    title={link.targetUrl}
                  >
                    {link.targetUrl}
                  </td>
                  <td className="px-2.5 py-2 font-pixel text-lg">
                    {link.owner}
                  </td>
                  <td className="px-2.5 py-2">
                    {link.hidden
                      ? "Hidden"
                      : link.isPublic
                        ? "Public"
                        : "Private"}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    {formatNumber(link.clickCount)}
                  </td>
                  <td className="px-2.5 py-2 whitespace-nowrap">
                    {formatRelative(link.createdAt, now)}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <Form method="post" className="inline">
                      <input type="hidden" name="code" value={link.code} />
                      <WinButton
                        name="intent"
                        value={link.hidden ? "unhide" : "hide"}
                      >
                        {link.hidden ? "Unhide" : "Hide"}
                      </WinButton>
                    </Form>{" "}
                    <Form
                      method="post"
                      className="inline"
                      onSubmit={(event) => {
                        if (
                          !confirm(
                            `Delete /r/${link.code}? This can't be undone.`,
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="code" value={link.code} />
                      <WinButton
                        name="intent"
                        value="delete"
                        className="text-[#991b1b]"
                      >
                        Delete
                      </WinButton>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs">
          Hidden links keep redirecting but leave the leaderboard and public
          stats. Delete stops the redirect for good.
        </p>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="bevel-in flex flex-col gap-1.5 bg-[#c0c0c0] p-3">
      <span className="text-xs font-bold">{label}</span>
      <span className="bg-black px-2 font-pixel text-4xl leading-none text-lime">
        {formatNumber(value)}
      </span>
    </div>
  );
}

function WinButton({
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { children: ReactNode }) {
  return (
    <button
      type="submit"
      className={cn(
        "bevel-out min-h-8 cursor-pointer px-2.5 text-xs font-bold active:[border-color:#404040_#ffffff_#ffffff_#404040]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

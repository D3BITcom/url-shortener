import { Form, Link, redirect, useLoaderData } from "react-router";
import { getContainer } from "~/.server/container";
import { getViewer } from "~/.server/session";
import { CopyButton } from "~/components/copy-button";
import { Notice } from "~/components/ui/alert";
import { VisibilityBadge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Counter } from "~/components/ui/counter";
import { Input, Label } from "~/components/ui/input";
import { Table, Td, Th, Tr } from "~/components/ui/table";
import { Window } from "~/components/ui/window";
import { displayUrl, domainOf, formatRelative } from "~/lib/format";
import type { Route } from "./+types/me";

export function meta({}: Route.MetaArgs) {
  return [{ title: "My links ~ d3b.it/r" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const container = await getContainer();

  // "Have a key?" form: hand off to the key route, which sets the cookie.
  const pastedKey = new URL(request.url).searchParams.get("key")?.trim();
  if (pastedKey) {
    const secret = pastedKey.split("/").pop() ?? "";
    throw redirect(`/key/${encodeURIComponent(secret)}`);
  }

  const { owner } = await getViewer(request, container);
  if (!owner) return { owner: null };

  const links = await container.shortUrls.listForOwner(owner.owner.id);
  return {
    owner: { keyLink: container.keyLinkFor(owner.secret) },
    now: new Date(),
    links: links.map((l) => ({
      code: l.code,
      shortLink: container.shortLinkFor(l.code),
      targetDomain: domainOf(l.targetUrl),
      isPublic: l.isPublic,
      hidden: l.hiddenAt !== null,
      clickCount: l.clickCount,
      createdAt: l.createdAt,
    })),
  };
}

/** "Forget me on this browser": drops the cookie; the key link still works. */
export async function action() {
  const container = await getContainer();
  return redirect("/me", {
    headers: {
      "Set-Cookie": await container.cookies.owner.serialize("", { maxAge: 0 }),
    },
  });
}

export default function MyLinks() {
  const data = useLoaderData<typeof loader>();
  if (!data.owner) return <NoOwner />;
  const { owner, links, now } = data;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col items-start gap-4">
          <h1 className="-rotate-1 border-4 border-ink bg-paper px-4 py-1 text-4xl font-bold italic shadow-[6px_6px_0_var(--color-grape)]">
            My links
          </h1>
          <p className="border-2 border-ink bg-white px-2.5 py-1 text-sm">
            Remembered in this browser. Lost it? Use your secret lobby link.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CopyButton
            value={owner.keyLink}
            label="Copy secret link"
            variant="ink"
          />
          <Button
            asChild
            variant="cta"
            size="md"
            className="skew-x-0 rounded-none"
          >
            <Link to="/">+ New link</Link>
          </Button>
        </div>
      </div>

      <Window
        title="MY_LINKS.EXE"
        aside={
          <span>
            {links.length} {links.length === 1 ? "LINK" : "LINKS"}
          </span>
        }
      >
        {links.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="font-bold">No links yet.</p>
            <Button asChild variant="yellow">
              <Link to="/">Shorten your first URL</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Short link</Th>
                <Th>Goes to</Th>
                <Th>Visibility</Th>
                <Th className="text-right">Clicks</Th>
                <Th>Created</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <Tr key={link.code}>
                  <Td>
                    <Link
                      to={`/stats/${link.code}`}
                      className="font-pixel text-2xl text-ink"
                    >
                      {displayUrl(link.shortLink)}
                    </Link>
                  </Td>
                  <Td>{link.targetDomain}</Td>
                  <Td>
                    <VisibilityBadge
                      isPublic={link.isPublic}
                      hidden={link.hidden}
                    />
                  </Td>
                  <Td className="text-right">
                    <Counter value={link.clickCount} />
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatRelative(link.createdAt, now)}
                  </Td>
                  <Td className="text-right">
                    <Link
                      to={`/stats/${link.code}`}
                      className="font-bold text-ink"
                    >
                      Stats →
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Window>

      <Form
        method="post"
        className="self-start"
        onSubmit={(event) => {
          if (
            !confirm(
              "Forget this browser? You'll need your secret link to get back in.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <Button type="submit" variant="link" size="sm">
          Forget me on this browser
        </Button>
      </Form>
    </div>
  );
}

function NoOwner() {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-7">
      <h1 className="-rotate-1 self-start border-4 border-ink bg-paper px-4 py-1 text-4xl font-bold italic shadow-[6px_6px_0_var(--color-grape)]">
        My links
      </h1>
      <Window title="WHO_ARE_YOU.TXT" tone="hot">
        <div className="flex flex-col gap-4 p-6">
          <p>
            This browser doesn't know you yet. Your links appear here after you
            shorten one, or when you open your secret lobby link.
          </p>
          <Form method="get" className="flex flex-col gap-2">
            <Label htmlFor="key">Paste your secret link</Label>
            <div className="flex flex-wrap gap-3">
              <Input
                id="key"
                name="key"
                required
                autoComplete="off"
                placeholder="d3b.it/r/key/k_…"
                className="flex-[1_1_280px]"
              />
              <Button type="submit" variant="yellow" className="h-14">
                Open
              </Button>
            </div>
          </Form>
        </div>
      </Window>
      <Notice>
        No account needed: whoever has the secret link owns the links. Signing
        in with D3BIT is coming soon.
      </Notice>
      <Button asChild variant="white" className="self-start">
        <Link to="/">← Shorten a URL</Link>
      </Button>
    </div>
  );
}

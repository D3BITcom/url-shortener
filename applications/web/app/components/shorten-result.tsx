import { BarChart3 } from "lucide-react";
import { Link } from "react-router";
import { CopyButton } from "~/components/copy-button";
import { VisibilityBadge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Window } from "~/components/ui/window";
import { displayUrl } from "~/lib/format";

export interface CreatedLink {
  code: string;
  shortLink: string;
  targetUrl: string;
  isPublic: boolean;
}

export function ShortenResult({
  link,
  keyLink,
  newOwner,
}: {
  link: CreatedLink;
  keyLink: string;
  /** First link in this browser: stress that the key is how they get back in. */
  newOwner: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8">
      <h1 className="rotate-1 border-4 border-ink bg-paper px-5 py-3 text-center text-4xl font-bold italic shadow-[8px_8px_0_var(--color-grape)]">
        IT'S ALIVE!
      </h1>

      <section
        aria-labelledby="short-title"
        className="-rotate-1 flex flex-col gap-4 border-[6px] border-double border-paper bg-violet p-7 text-white shadow-hard-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="short-title"
            className="text-sm font-bold tracking-[0.12em] text-lime-soft"
          >
            YOUR SHORT LINK
          </h2>
          <VisibilityBadge isPublic={link.isPublic} />
        </div>
        <a
          href={link.shortLink}
          target="_blank"
          rel="noreferrer"
          className="font-pixel text-4xl leading-none break-all text-white no-underline hover:underline sm:text-5xl"
        >
          {displayUrl(link.shortLink)}
        </a>
        <p className="text-[13px] break-all text-lilac">→ {link.targetUrl}</p>
        <div className="flex flex-wrap gap-3">
          <CopyButton value={link.shortLink} label="Copy link" />
          <Button asChild variant="white">
            <Link to={`/stats/${link.code}`}>
              <BarChart3 aria-hidden />
              View stats
            </Link>
          </Button>
        </div>
      </section>

      <Window title="SECRET_KEY.TXT" tone="hot">
        <div className="flex flex-col gap-3.5 p-6">
          <p className="text-[17px] font-bold">Your private lobby link</p>
          <div className="flex flex-wrap items-stretch gap-3">
            <code className="flex flex-[1_1_300px] items-center bg-ink px-3.5 py-2.5 font-pixel text-xl break-all text-lime-soft">
              {displayUrl(keyLink)}
            </code>
            <CopyButton value={keyLink} />
          </div>
          <p className="text-sm leading-relaxed">
            {newOwner && "This is the key to all your links. "}
            <strong>Bookmark it.</strong> Anyone with it can see your private
            stats. This browser also remembers you, so you only need the key on
            another device or after clearing cookies.
          </p>
        </div>
      </Window>

      <section
        aria-labelledby="acct-title"
        className="flex flex-wrap items-center justify-between gap-4 border-4 border-dashed border-ink bg-paper p-6"
      >
        <div className="flex flex-[1_1_320px] flex-col gap-1.5">
          <h2 id="acct-title" className="text-[17px] font-bold">
            Rather not keep a secret link around?
          </h2>
          <p className="text-sm">
            Save your links to your D3BIT account and sign in from anywhere.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="white" disabled>
            Save to D3BIT
          </Button>
          <span className="rotate-6 border-2 border-ink bg-pink px-2 font-pixel text-xl">
            SOON
          </span>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild variant="white">
          <Link to="/">← Shorten another</Link>
        </Button>
        <Button asChild variant="ink">
          <Link to="/me">Open my lobby →</Link>
        </Button>
      </div>
    </div>
  );
}

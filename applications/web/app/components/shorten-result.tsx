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
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <h1 className="rotate-1 border-4 border-ink bg-paper px-5 py-1.5 text-center text-3xl font-bold italic shadow-[8px_8px_0_var(--color-grape)]">
        IT'S ALIVE!
      </h1>

      <section
        aria-labelledby="short-title"
        className="-rotate-1 flex flex-col gap-4 border-[6px] border-double border-paper bg-violet p-6 text-white shadow-hard-lg"
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
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-stretch gap-3">
            <code className="flex flex-[1_1_300px] items-center bg-ink px-3.5 py-2.5 font-pixel text-xl break-all text-lime-soft">
              {displayUrl(keyLink)}
            </code>
            <CopyButton value={keyLink} />
          </div>
          <p className="text-sm leading-relaxed">
            {newOwner && <strong>Bookmark it. </strong>}
            Your key to these links on any device. Anyone holding it can manage
            them.
          </p>
        </div>
      </Window>

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

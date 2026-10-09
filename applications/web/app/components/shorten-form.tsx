import { ArrowRight, BarChart3, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, Link, useNavigation } from "react-router";
import { CopyButton } from "~/components/copy-button";
import { ErrorAlert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { displayUrl } from "~/lib/format";

export type ShortenResult =
  | {
      ok: true;
      created: boolean;
      link: { code: string; shortLink: string; targetUrl: string };
    }
  | { ok: false; error: string; url: string };

export function ShortenForm({ result }: { result: ShortenResult | undefined }) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear the input after a success; keep it (and focus it) after an error.
  useEffect(() => {
    if (!result) return;
    if (result.ok) formRef.current?.reset();
    else inputRef.current?.focus();
  }, [result]);

  const error = result && !result.ok ? result : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Form
        ref={formRef}
        method="post"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="url" className="sr-only">
          URL to shorten
        </label>
        <Input
          ref={inputRef}
          id="url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus
          placeholder="Paste a long URL, e.g. example.com/some/long/path"
          defaultValue={error?.url}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "url-error" : undefined}
          className="h-12 sm:flex-1"
        />
        {/* Honeypot: hidden from people, but naive bots fill every field. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Shortening…
            </>
          ) : (
            <>
              Shorten
              <ArrowRight aria-hidden />
            </>
          )}
        </Button>
      </Form>

      {error && <ErrorAlert id="url-error">{error.error}</ErrorAlert>}

      {result?.ok && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-accent p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-accent-foreground">
              {result.created
                ? "Your short link is ready"
                : "This URL was already shortened"}
            </p>
            <a
              href={result.link.shortLink}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-lg font-semibold text-foreground hover:underline"
            >
              {displayUrl(result.link.shortLink)}
            </a>
            <p
              className="truncate text-xs text-muted-foreground"
              title={result.link.targetUrl}
            >
              → {result.link.targetUrl}
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton value={result.link.shortLink} />
            <Button asChild variant="ghost" size="sm">
              <Link to={`/links/${result.link.code}`}>
                <BarChart3 aria-hidden />
                Stats
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

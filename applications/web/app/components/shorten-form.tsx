import { useEffect, useRef } from "react";
import { Form, useNavigation } from "react-router";
import { ErrorAlert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input, Label, PrefixedInput } from "~/components/ui/input";
import { PaperCard } from "~/components/ui/window";

export interface ShortenFields {
  url: string;
  slug: string;
  isPublic: boolean;
}

export function ShortenForm({
  error,
  fields,
  turnstileSiteKey,
  shortLinkPrefix,
}: {
  error?: string;
  fields?: ShortenFields;
  turnstileSiteKey: string | null;
  /** "d3b.it/r/" */
  shortLinkPrefix: string;
}) {
  const submitting = useNavigation().state === "submitting";
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!error) return;
    urlRef.current?.focus();
    // A Turnstile token is single-use: get a fresh one for the next attempt.
    window.turnstile?.reset();
  }, [error]);

  return (
    <PaperCard className="mx-auto max-w-[640px]">
      <h1 className="wavy text-center text-3xl leading-snug font-bold tracking-wide text-fuchsia italic sm:text-4xl">
        ~*~ URL Shortener ~*~
      </h1>
      <Form method="post" className="mt-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="url">Long URL</Label>
          <Input
            ref={urlRef}
            id="url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            required
            autoFocus
            placeholder="example.com/some/very/long/path"
            defaultValue={fields?.url}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "form-error" : undefined}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">
            Custom ending{" "}
            <span className="font-normal normal-case">(optional)</span>
          </Label>
          <PrefixedInput
            prefix={shortLinkPrefix}
            id="slug"
            name="slug"
            type="text"
            autoComplete="off"
            placeholder="ShOrTUr1"
            maxLength={32}
            defaultValue={fields?.slug}
            title="4-32 letters, numbers, - or _"
          />
        </div>

        <div className="flex items-center gap-3.5 border-[3px] border-ink bg-white p-3 shadow-hard">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            defaultChecked={fields?.isPublic}
            className="size-6 flex-none accent-fuchsia"
          />
          <label htmlFor="isPublic" className="text-[15px] font-bold">
            Public stats{" "}
            <span className="font-normal">(eligible for the Top 10)</span>
          </label>
        </div>

        {/* Honeypot: hidden from people, but naive bots fill every field. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />

        {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} />}

        {error && <ErrorAlert id="form-error">{error}</ErrorAlert>}

        <Button type="submit" variant="cta" size="lg" disabled={submitting}>
          {submitting ? "★ SHORTENING... ★" : "★ SHORTEN IT ★"}
        </Button>
      </Form>
    </PaperCard>
  );
}

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

/**
 * Cloudflare Turnstile in "interaction-only" mode: invisible for almost
 * everyone, a checkbox only when Cloudflare is unsure. It adds a hidden
 * `cf-turnstile-response` field to the form.
 */
function TurnstileWidget({ siteKey }: { siteKey: string }) {
  return (
    <>
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-appearance="interaction-only"
      />
    </>
  );
}

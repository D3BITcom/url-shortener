import { DomainError } from "@url-shortener/engine";
import { BarChart3, Link2, ShieldCheck } from "lucide-react";
import { data, useActionData } from "react-router";
import { getContainer } from "~/.server/container";
import { ShortenForm, type ShortenResult } from "~/components/shorten-form";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "URL Shortener" },
    { name: "description", content: "Shorten links and see who clicks them." },
  ];
}

// Controller: parse → guard → call the service → map to a view model.
export async function action({ request, context }: Route.ActionArgs) {
  const { shortUrls, creationLimiter, shortLinkFor } = await getContainer();
  const form = await request.formData();
  const url = String(form.get("url") ?? "");

  const fail = (error: string, status: number, headers?: HeadersInit) =>
    data<ShortenResult>({ ok: false, error, url }, { status, headers });

  if (form.get("website")) {
    return fail("Something went wrong. Please try again.", 400);
  }

  const limit = creationLimiter.consume(context.clientIp ?? "unknown");
  if (!limit.allowed) {
    return fail(
      `Too many links created. Please try again in ${limit.retryAfterSeconds} seconds.`,
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  try {
    const { shortUrl, created } = await shortUrls.shorten(url);
    return data<ShortenResult>({
      ok: true,
      created,
      link: {
        code: shortUrl.code,
        shortLink: shortLinkFor(shortUrl.code),
        targetUrl: shortUrl.targetUrl,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) return fail(error.message, 400);
    console.error("Failed to shorten URL", error);
    return fail("Something went wrong on our side. Please try again.", 500);
  }
}

export default function Index() {
  const result = useActionData<typeof action>();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-10 sm:py-16">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Short links, real insights
        </h1>
        <p className="text-muted-foreground">
          Paste a long URL to get a short link, then see where your clicks come
          from.
        </p>
      </div>

      <ShortenForm result={result} />

      <ul className="grid gap-4 text-sm sm:grid-cols-3">
        <Feature icon={Link2} title="Short & unguessable">
          Random 7-character codes, no look-alike characters.
        </Feature>
        <Feature icon={BarChart3} title="Click analytics">
          Countries, devices, referrers and daily trends.
        </Feature>
        <Feature icon={ShieldCheck} title="Privacy-friendly">
          No raw IPs stored. Bots are filtered out of your numbers.
        </Feature>
      </ul>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Link2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg p-3">
      <Icon className="size-5 text-primary" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </li>
  );
}

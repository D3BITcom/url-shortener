import { data, useActionData, useLoaderData } from "react-router";
import { getContainer } from "~/.server/container";
import { isExpected, toUserMessage } from "~/.server/errors";
import { logger } from "~/.server/logger";
import { ShortenForm, type ShortenFields } from "~/components/shorten-form";
import { ShortenResult, type CreatedLink } from "~/components/shorten-result";
import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "d3b.it/r ~ URL Shortener" },
    {
      name: "description",
      content: "Short links with real, privacy-friendly stats.",
    },
  ];
}

export async function loader() {
  const { turnstileSiteKey, shortLinkPrefix } = await getContainer();
  return { turnstileSiteKey, shortLinkPrefix };
}

type ActionResult =
  | { ok: true; link: CreatedLink; keyLink: string; newOwner: boolean }
  | { ok: false; error: string; fields: ShortenFields };

// Controller: parse → guard (honeypot, rate limit, human check) → identify
// the owner → call the service → map to a view model.
export async function action({ request, context }: Route.ActionArgs) {
  const container = await getContainer();
  const form = await request.formData();
  const fields: ShortenFields = {
    url: String(form.get("url") ?? ""),
    slug: String(form.get("slug") ?? ""),
    isPublic: form.get("isPublic") === "on",
  };
  const fail = (error: string, status: number, headers?: HeadersInit) =>
    data<ActionResult>({ ok: false, error, fields }, { status, headers });

  if (form.get("website")) {
    logger.warn({ reason: "honeypot" }, "Link creation blocked");
    return fail("Something went wrong. Please try again.", 400);
  }

  const limit = container.limiters.createLink.consume(
    context.clientIp ?? "unknown",
  );
  if (!limit.allowed) {
    logger.warn({ reason: "rate-limit" }, "Link creation blocked");
    return fail(
      `Whoa, slow down! Try again in ${limit.retryAfterSeconds} seconds.`,
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const token = form.get("cf-turnstile-response");
  if (
    !(await container.humanVerifier.verify(
      token ? String(token) : null,
      context.clientIp,
    ))
  ) {
    logger.warn({ reason: "turnstile" }, "Link creation blocked");
    return fail("We couldn't confirm you're a human. Please try again.", 400);
  }

  // The owner is created on the first link and remembered in a cookie.
  const cookieSecret = await container.cookies.owner.parse(
    request.headers.get("Cookie"),
  );
  const session = await container.owners.authenticateOrCreate(
    typeof cookieSecret === "string" ? cookieSecret : null,
  );
  const headers = session.created
    ? { "Set-Cookie": await container.cookies.owner.serialize(session.secret) }
    : undefined;

  try {
    const shortUrl = await container.shortUrls.shorten({
      ...fields,
      ownerId: session.owner.id,
    });
    logger.info(
      {
        code: shortUrl.code,
        isPublic: shortUrl.isPublic,
        custom: shortUrl.isCustomSlug,
      },
      "Link created",
    );
    return data<ActionResult>(
      {
        ok: true,
        link: {
          code: shortUrl.code,
          shortLink: container.shortLinkFor(shortUrl.code),
          targetUrl: shortUrl.targetUrl,
          isPublic: shortUrl.isPublic,
        },
        keyLink: container.keyLinkFor(session.secret),
        newOwner: session.created,
      },
      { headers },
    );
  } catch (error) {
    return fail(
      toUserMessage(error, "shorten"),
      isExpected(error) ? 400 : 500,
      headers,
    );
  }
}

export default function Index() {
  const { turnstileSiteKey, shortLinkPrefix } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  if (result?.ok) {
    return (
      <ShortenResult
        link={result.link}
        keyLink={result.keyLink}
        newOwner={result.newOwner}
      />
    );
  }

  return (
    <ShortenForm
      error={result?.error}
      fields={result?.fields}
      turnstileSiteKey={turnstileSiteKey}
      shortLinkPrefix={shortLinkPrefix}
    />
  );
}

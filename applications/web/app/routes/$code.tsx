import { redirect } from "react-router";
import { getContainer } from "~/.server/container";
import { logger } from "~/.server/logger";
import type { Route } from "./+types/$code";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { shortUrls, analytics } = await getContainer();
  const shortUrl = await shortUrls.resolve(params.code);
  if (!shortUrl) {
    throw new Response("Link not found", { status: 404 });
  }

  if (!isPrefetch(request)) {
    // Fire-and-forget: analytics must never slow down or break a redirect.
    analytics
      .recordClick(shortUrl, {
        ip: context.clientIp,
        userAgent: request.headers.get("user-agent"),
        referrer: request.headers.get("referer"),
      })
      .catch((error) =>
        logger.error(
          { err: error, code: shortUrl.code },
          "Failed to record click",
        ),
      );
  }

  return redirect(shortUrl.targetUrl, {
    status: 302,
    // A cached redirect would skip us, and the click would never be counted.
    headers: { "Cache-Control": "private, no-store" },
  });
}

// The loader always redirects or throws, so this never renders. Having a
// component makes this a UI route rather than a resource route, so a dead
// link shows the app's styled 404 page instead of plain text.
export default function ShortLinkRedirect() {
  return null;
}

/** Browsers prefetch links speculatively; those aren't real clicks. */
function isPrefetch(request: Request): boolean {
  const purpose =
    request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  return purpose.includes("prefetch");
}

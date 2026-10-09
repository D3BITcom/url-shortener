import { redirect } from "react-router";
import { getContainer } from "~/.server/container";
import type { Route } from "./+types/key.$secret";

/**
 * The secret lobby link (d3b.it/r/key/k_…): proves ownership, remembers it
 * in this browser's cookie, then moves on to /me so the key leaves the
 * address bar and browser history as soon as possible.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const container = await getContainer();
  const session = await container.owners.authenticate(params.secret);
  if (!session) {
    throw new Response("Unknown key", { status: 404 });
  }

  return redirect("/me", {
    headers: {
      "Set-Cookie": await container.cookies.owner.serialize(session.secret),
      "Referrer-Policy": "no-referrer",
    },
  });
}

export default function KeyLink() {
  return null;
}

import { data, Form, redirect, useActionData } from "react-router";
import { getContainer } from "~/.server/container";
import { logger } from "~/.server/logger";
import { getViewer, isAdminToken } from "~/.server/session";
import { ErrorAlert } from "~/components/ui/alert";
import type { Route } from "./+types/admin.login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin login ~ d3b.it/r" },
    { name: "robots", content: "noindex" },
  ];
}

/** Without ADMIN_TOKEN the admin area doesn't exist at all. */
async function adminContainer() {
  const container = await getContainer();
  if (!container.adminToken) throw new Response("Not found", { status: 404 });
  return container;
}

export async function loader({ request }: Route.LoaderArgs) {
  const container = await adminContainer();
  const { viewer } = await getViewer(request, container);
  if (viewer.isAdmin) throw redirect("/admin");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const container = await adminContainer();

  const limit = container.limiters.adminLogin.consume(
    context.clientIp ?? "unknown",
  );
  if (!limit.allowed) {
    logger.warn({ reason: "rate-limit" }, "Admin login blocked");
    return data(
      { error: `Too many attempts. Wait ${limit.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const token = String((await request.formData()).get("token") ?? "");
  if (!isAdminToken(container, token)) {
    logger.warn("Admin login failed");
    return data({ error: "Wrong token." }, { status: 401 });
  }

  logger.info("Admin logged in");
  return redirect("/admin", {
    headers: { "Set-Cookie": await container.cookies.admin.serialize(true) },
  });
}

export default function AdminLogin() {
  const result = useActionData<typeof action>();

  return (
    <div className="bevel-out mx-auto max-w-md shadow-[10px_10px_0_var(--color-ink)]">
      <div className="bg-[linear-gradient(90deg,#000080,#1084d0)] px-2 py-1 text-sm font-bold text-white">
        Admin login
      </div>
      <Form method="post" className="flex flex-col gap-4 p-5 text-black">
        <label htmlFor="token" className="text-sm font-bold">
          Admin token
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="bevel-in h-10 bg-white px-2 font-mono"
        />
        {result?.error && <ErrorAlert>{result.error}</ErrorAlert>}
        <button
          type="submit"
          className="bevel-out min-h-10 cursor-pointer self-end px-6 text-sm font-bold active:[border-color:#404040_#ffffff_#ffffff_#404040]"
        >
          OK
        </button>
      </Form>
    </div>
  );
}

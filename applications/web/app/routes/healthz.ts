import { getContainer } from "~/.server/container";

/** Liveness probe for Docker / uptime checks: 200 only if the database answers. */
export async function loader() {
  try {
    const { shortUrls } = await getContainer();
    await shortUrls.list(1);
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error" }, { status: 503 });
  }
}

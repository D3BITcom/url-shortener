import { getContainer } from "~/.server/container";
import { logger } from "~/.server/logger";

/** Liveness probe for Docker / uptime checks: 200 only if the database answers. */
export async function loader() {
  try {
    await (await getContainer()).checkDatabase();
    return Response.json({ status: "ok" });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return Response.json({ status: "error" }, { status: 503 });
  }
}

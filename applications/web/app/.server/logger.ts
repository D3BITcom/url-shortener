import pino from "pino";

/**
 * Structured JSON logs (one object per line) on stdout. Docker keeps and
 * rotates them; anyone (or any agent) can filter them with jq, e.g.
 *   docker compose logs web --no-log-prefix | jq 'select(.level >= 50)'
 * Levels: 30 info, 40 warn, 50 error.
 *
 * Never log raw IPs, owner keys or admin tokens: see `redactPath`.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "url-shortener" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Owner keys live in /r/key/<secret> URLs; never write them to logs. */
export function redactPath(path: string): string {
  return path.replace(/\/key\/[^/?#]+/, "/key/[redacted]");
}

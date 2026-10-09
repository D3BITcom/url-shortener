import { randomUUID } from "node:crypto";
import { createRequestHandler } from "@react-router/express";
import express from "express";
import "react-router";
import { getContainer } from "~/.server/container";
import { logger, redactPath } from "~/.server/logger";

declare module "react-router" {
  interface AppLoadContext {
    /** Real client IP: the socket address, or the proxy's X-Forwarded-For when TRUST_PROXY is set. */
    clientIp: string | null;
  }
}

/** Form posts only carry a URL; anything bigger is abuse, not a link. */
const MAX_BODY_BYTES = 16 * 1024;

// Build services (and validate the environment) when this module loads, so a
// bad config stops the production server at boot with a readable message.
// In dev the module loads lazily, so the same error shows on the first request.
await getContainer();

export const app = express();

// Without a proxy, X-Forwarded-For is attacker-controlled, so it's ignored.
// Behind nginx, trust exactly one hop: Express then takes the address nginx
// appended, not whatever the client put in the header.
app.set("trust proxy", trustProxySetting(process.env.TRUST_PROXY));

// One log line per request. No IPs (privacy) and owner keys redacted.
app.use((req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    const entry = {
      requestId,
      method: req.method,
      path: redactPath(req.originalUrl),
      status: res.statusCode,
      ms: Math.round(performance.now() - started),
    };
    if (res.statusCode >= 500) logger.error(entry, "request failed");
    else logger.info(entry, "request");
  });
  next();
});

// The app lives under /r (d3b.it/r/...). Locally, send the bare origin there;
// in production nginx only forwards /r/ and handles everything else.
app.get("/", (_req, res) => res.redirect(302, "/r"));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  const length = Number(req.headers["content-length"] ?? 0);
  if (length > MAX_BODY_BYTES) {
    res.status(413).send("Payload Too Large");
    return;
  }
  next();
});

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext: (req) => ({ clientIp: req.ip ?? null }),
  }),
);

/** "true" → 1 hop, a number → that many hops, anything else → off. */
function trustProxySetting(value: string | undefined): number | false {
  if (value === "true") return 1;
  const hops = Number(value);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

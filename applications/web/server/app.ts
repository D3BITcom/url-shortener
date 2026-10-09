import { createRequestHandler } from "@react-router/express";
import express from "express";
import "react-router";

declare module "react-router" {
  interface AppLoadContext {
    /** Real client IP: the socket address, or the proxy's X-Forwarded-For when TRUST_PROXY is set. */
    clientIp: string | null;
  }
}

/** Form posts only carry a URL; anything bigger is abuse, not a link. */
const MAX_BODY_BYTES = 16 * 1024;

export const app = express();

// Without a proxy, X-Forwarded-For is attacker-controlled, so it's ignored.
// Behind nginx, trust exactly one hop: Express then takes the address nginx
// appended, not whatever the client put in the header.
app.set("trust proxy", trustProxySetting(process.env.TRUST_PROXY));

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

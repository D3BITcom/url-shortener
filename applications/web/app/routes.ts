import { type RouteConfig, index, route } from "@react-router/dev/routes";

// All paths are under the /r basename (react-router.config.ts).
// Static segments win over `:code`, which is why they're reserved slugs.
export default [
  index("routes/_index.tsx"), // create a link
  route("me", "routes/me.tsx"), // my links (lobby)
  route("key/:secret", "routes/key.$secret.tsx"), // secret key link -> cookie
  route("stats/:code", "routes/stats.$code.tsx"),
  route("top", "routes/top.tsx"), // leaderboard
  route("admin", "routes/admin._index.tsx"),
  route("admin/login", "routes/admin.login.tsx"),
  route("healthz", "routes/healthz.ts"),
  route(":code", "routes/$code.tsx"), // the redirect itself
] satisfies RouteConfig;

import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("links", "routes/links._index.tsx"),
  route("links/:code", "routes/links.$code.tsx"),
  route("s/:code", "routes/s.$code.tsx"),
] satisfies RouteConfig;

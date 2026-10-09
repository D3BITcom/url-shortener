// HTTP entry point, based on React Router's official "node-custom-server"
// template. We use it instead of `react-router-serve` because loaders need the
// client IP (rate limiting, geolocation), and only Express can provide it.
//
//   node server.js --dev   Vite dev server with HMR
//   node server.js         serves the production build
import { existsSync } from "node:fs";
import compression from "compression";
import express from "express";

const DEVELOPMENT = process.argv.includes("--dev");

// One .env at the repo root is shared by every package. In Docker the
// variables come from the environment and the file doesn't exist.
const rootEnv = new URL("../../.env", import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const server = express();
server.disable("x-powered-by");
server.use(compression());

if (DEVELOPMENT) {
  const vite = await import("vite");
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
  });
  server.use(viteDevServer.middlewares);
  server.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (error instanceof Error) viteDevServer.ssrFixStacktrace(error);
      next(error);
    }
  });
} else {
  server.use(
    "/r/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  // redirect: false — let React Router answer /r itself instead of a 301 to /r/.
  server.use(
    "/r",
    express.static("build/client", { maxAge: "1h", redirect: false }),
  );
  server.use(await import("./build/server/index.js").then((mod) => mod.app));
}

server.listen(PORT, () => {
  console.log(
    `${DEVELOPMENT ? "Development" : "Production"} server on http://localhost:${PORT}`,
  );
});

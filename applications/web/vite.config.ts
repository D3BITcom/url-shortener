import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild }) => ({
  envDir: "../..",
  // Matches the router basename, so assets are served from /r/assets too.
  base: "/r/",
  // The server bundle's entry is our Express app (server/app.ts), which
  // wraps React Router's request handler. See server.js.
  build: {
    rollupOptions: isSsrBuild ? { input: "./server/app.ts" } : undefined,
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    // Workspace libs ship TypeScript source, so they're bundled into the server build.
    noExternal: ["@url-shortener/engine", "@url-shortener/database"],
    // Native addons can't be bundled; they load from node_modules at runtime,
    // which is why `better-sqlite3` is also a direct dependency of this app.
    external: ["better-sqlite3"],
  },
}));

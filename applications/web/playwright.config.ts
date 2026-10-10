import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);

/**
 * End-to-end tests against the production build (run `pnpm test:e2e`, which
 * builds first). One worker: the tests share one SQLite file and rate limiter.
 */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  reporter: CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:3100/r/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "sh e2e/start-server.sh",
    url: "http://localhost:3100/r/healthz",
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
});

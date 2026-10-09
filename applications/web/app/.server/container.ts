import {
  connectDatabase,
  PrismaClickRepository,
  PrismaShortUrlRepository,
} from "@url-shortener/database";
import {
  AnalyticsService,
  FixedWindowRateLimiter,
  ShortUrlService,
} from "@url-shortener/engine";
import { loadConfig } from "./config";
import { createGeoResolver } from "./geoip";

/**
 * Composition root: the one place where concrete implementations are chosen
 * and wired together. Controllers ask for services and never construct them.
 */
export interface Container {
  shortUrls: ShortUrlService;
  analytics: AnalyticsService;
  creationLimiter: FixedWindowRateLimiter;
  /** Public short link for a code, e.g. https://sho.rt/s/abc2345 */
  shortLinkFor(code: string): string;
}

async function createContainer(): Promise<Container> {
  const config = loadConfig();
  const publicUrl = new URL(config.PUBLIC_URL);
  const prisma = await sharedDatabase(config.DATABASE_URL);

  return {
    shortUrls: new ShortUrlService(new PrismaShortUrlRepository(prisma), {
      blockedHosts: [publicUrl.hostname],
    }),
    analytics: new AnalyticsService(new PrismaClickRepository(prisma), {
      geo: await createGeoResolver(config.GEOIP_DB_PATH),
      salt: config.ANALYTICS_SALT,
    }),
    creationLimiter: new FixedWindowRateLimiter({
      limit: config.RATE_LIMIT_MAX,
      windowMs: config.RATE_LIMIT_WINDOW_SECONDS * 1000,
    }),
    shortLinkFor: (code) => new URL(`/s/${code}`, publicUrl).href,
  };
}

let container: Promise<Container> | undefined;

export function getContainer(): Promise<Container> {
  container ??= createContainer();
  return container;
}

// Vite re-evaluates changed modules in dev, which rebuilds the container so
// code edits apply right away. Only the database connection lives on
// globalThis, so it survives reloads instead of leaking a new one each time.
const globalForDb = globalThis as {
  __db?: ReturnType<typeof connectDatabase>;
};

function sharedDatabase(url: string): ReturnType<typeof connectDatabase> {
  globalForDb.__db ??= connectDatabase(url);
  return globalForDb.__db;
}

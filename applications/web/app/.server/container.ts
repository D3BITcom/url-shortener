import {
  connectDatabase,
  PrismaClickRepository,
  PrismaOwnerRepository,
  PrismaShortUrlRepository,
} from "@url-shortener/database";
import {
  AnalyticsService,
  DisabledHumanVerifier,
  FixedWindowRateLimiter,
  OwnerService,
  ShortUrlService,
  type HumanVerifier,
} from "@url-shortener/engine";
import { createCookie, type Cookie } from "react-router";
import { loadConfig } from "./config";
import { createGeoResolver } from "./geoip";
import { TurnstileVerifier } from "./turnstile";

/**
 * Composition root: the one place where concrete implementations are chosen
 * and wired together. Controllers ask for services and never construct them.
 */
export interface Container {
  shortUrls: ShortUrlService;
  analytics: AnalyticsService;
  owners: OwnerService;
  humanVerifier: HumanVerifier;
  /** Public site key for the Turnstile widget, when enabled. */
  turnstileSiteKey: string | null;
  limiters: {
    createLink: FixedWindowRateLimiter;
    adminLogin: FixedWindowRateLimiter;
  };
  cookies: { owner: Cookie; admin: Cookie };
  /** null = admin console disabled. */
  adminToken: string | null;
  /** "d3b.it/r/" — shown in front of the custom slug field. */
  shortLinkPrefix: string;
  /** Throws if the database doesn't answer (health check). */
  checkDatabase(): Promise<void>;
  /** https://d3b.it/r/ShOrTUr1 */
  shortLinkFor(code: string): string;
  /** https://d3b.it/r/key/k_… — the owner's way back in from any device. */
  keyLinkFor(secret: string): string;
}

async function createContainer(): Promise<Container> {
  const config = loadConfig();
  const publicUrl = new URL(config.PUBLIC_URL);
  const prisma = await sharedDatabase(config.DATABASE_URL);
  const cookieDefaults = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: publicUrl.protocol === "https:",
    path: "/r",
    secrets: [config.COOKIE_SECRET],
  };

  return {
    shortUrls: new ShortUrlService(new PrismaShortUrlRepository(prisma), {
      blockedHosts: [publicUrl.hostname],
    }),
    analytics: new AnalyticsService(new PrismaClickRepository(prisma), {
      geo: await createGeoResolver(config.GEOIP_DB_PATH),
      salt: config.ANALYTICS_SALT,
    }),
    owners: new OwnerService(new PrismaOwnerRepository(prisma)),
    humanVerifier: config.TURNSTILE_SECRET_KEY
      ? new TurnstileVerifier(config.TURNSTILE_SECRET_KEY)
      : new DisabledHumanVerifier(),
    turnstileSiteKey: config.TURNSTILE_SITE_KEY ?? null,
    limiters: {
      createLink: new FixedWindowRateLimiter({
        limit: config.RATE_LIMIT_MAX,
        windowMs: config.RATE_LIMIT_WINDOW_SECONDS * 1000,
      }),
      adminLogin: new FixedWindowRateLimiter({ limit: 5, windowMs: 60_000 }),
    },
    cookies: {
      // Browsers cap cookie lifetime at 400 days; the key link is the backup.
      owner: createCookie("d3b_owner", {
        ...cookieDefaults,
        maxAge: 400 * 24 * 3600,
      }),
      admin: createCookie("d3b_admin", {
        ...cookieDefaults,
        maxAge: 12 * 3600,
      }),
    },
    adminToken: config.ADMIN_TOKEN ?? null,
    shortLinkPrefix: `${publicUrl.host}/r/`,
    checkDatabase: async () => {
      await prisma.$queryRawUnsafe("SELECT 1");
    },
    shortLinkFor: (code) => new URL(`/r/${code}`, publicUrl).href,
    keyLinkFor: (secret) => new URL(`/r/key/${secret}`, publicUrl).href,
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

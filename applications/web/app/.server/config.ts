import { z } from "zod";

const secret = (name: string) =>
  z
    .string()
    .min(16, `${name} must be at least 16 characters (openssl rand -hex 32)`);

const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const schema = z
  .object({
    /** Origin short links are built from, e.g. https://d3b.it */
    PUBLIC_URL: z.url(),
    DATABASE_URL: z.string().min(1),
    ANALYTICS_SALT: secret("ANALYTICS_SALT"),
    /** Signs the owner and admin cookies. */
    COOKIE_SECRET: secret("COOKIE_SECRET"),
    /** Unset = admin console disabled (404). */
    ADMIN_TOKEN: optional(secret("ADMIN_TOKEN")),
    GEOIP_DB_PATH: optional(z.string()),
    TURNSTILE_SITE_KEY: optional(z.string()),
    TURNSTILE_SECRET_KEY: optional(z.string()),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  })
  .refine(
    (c) => Boolean(c.TURNSTILE_SITE_KEY) === Boolean(c.TURNSTILE_SECRET_KEY),
    "Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither.",
  );

export type Config = z.infer<typeof schema>;

/** Fail at startup with a readable list, instead of at the first request. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

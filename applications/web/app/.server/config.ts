import { z } from "zod";

const schema = z.object({
  PUBLIC_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  ANALYTICS_SALT: z
    .string()
    .min(
      16,
      "ANALYTICS_SALT must be at least 16 characters (openssl rand -hex 32)",
    ),
  GEOIP_DB_PATH: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

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

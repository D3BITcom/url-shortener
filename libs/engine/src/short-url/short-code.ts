import { randomInt } from "node:crypto";
import { InvalidSlugError } from "../shared/errors";

/**
 * Base62 without look-alike characters (0/O, 1/I/l), so codes survive being
 * read aloud or retyped. Codes are unique ignoring case, which still leaves
 * tens of billions of 7-character combinations; the service retries on the
 * rare collision.
 */
export const SHORT_CODE_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const SHORT_CODE_LENGTH = 7;

export const CUSTOM_SLUG_MIN = 4;
export const CUSTOM_SLUG_MAX = 32;

/**
 * Paths the app itself uses under /r/, plus a few that would invite
 * confusion or impersonation. Compared ignoring case.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "assets",
  "healthz",
  "help",
  "key",
  "login",
  "logout",
  "me",
  "new",
  "stats",
  "support",
  "top",
  "d3bit",
]);

export type ShortCodeGenerator = () => string;

/**
 * Codes are random rather than sequential, so the set of links can't be
 * listed by counting up. `randomInt` uses a CSPRNG with no modulo bias.
 */
export function generateShortCode(length = SHORT_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)];
  }
  return code;
}

/** Cheap format check so junk paths never reach the database. */
export function isWellFormedShortCode(code: string): boolean {
  return /^[A-Za-z0-9_-]{4,32}$/.test(code);
}

/** The key that uniqueness and lookups use: "ShOrTUr1" and "shorturl1" are the same link. */
export function codeKey(code: string): string {
  return code.toLowerCase();
}

/** @throws InvalidSlugError with a message the user can act on. */
export function validateCustomSlug(input: string): string {
  const slug = input.trim();
  if (slug.length < CUSTOM_SLUG_MIN || slug.length > CUSTOM_SLUG_MAX) {
    throw new InvalidSlugError(
      `Custom endings need ${CUSTOM_SLUG_MIN} to ${CUSTOM_SLUG_MAX} characters.`,
    );
  }
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw new InvalidSlugError(
      "Custom endings can only use letters, numbers, - and _.",
    );
  }
  if (RESERVED_SLUGS.has(codeKey(slug))) {
    throw new InvalidSlugError("That ending is reserved. Try another one.");
  }
  return slug;
}

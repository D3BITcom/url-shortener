import { randomInt } from "node:crypto";

/**
 * Base62 without look-alike characters (0/O, 1/I/l), so codes survive being
 * read aloud or retyped. 57^7 ≈ 1.9 trillion combinations: collisions are
 * very rare, and the service retries when one happens.
 */
export const SHORT_CODE_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const SHORT_CODE_LENGTH = 7;

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
  return /^[A-Za-z0-9]{4,16}$/.test(code);
}

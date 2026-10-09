import { createHash, randomInt } from "node:crypto";

/**
 * An anonymous owner of links. No email, no password: whoever holds the
 * secret key is the owner. Later, `accountId` links it to a D3BIT account.
 */
export interface Owner {
  id: string;
  createdAt: Date;
  accountId: string | null;
}

export interface OwnerRepository {
  create(input: { secretHash: string }): Promise<Owner>;
  findBySecretHash(secretHash: string): Promise<Owner | null>;
}

const SECRET_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SECRET_LENGTH = 24; // ~143 bits: unguessable, no need for a slow hash

/** "k_" prefix makes keys recognisable in logs (where they get redacted) and in support chats. */
export function generateOwnerSecret(): string {
  let secret = "k_";
  for (let i = 0; i < SECRET_LENGTH; i++) {
    secret += SECRET_ALPHABET[randomInt(SECRET_ALPHABET.length)];
  }
  return secret;
}

export function isWellFormedOwnerSecret(secret: string): boolean {
  return /^k_[0-9A-Za-z]{24}$/.test(secret);
}

/**
 * Only the hash is stored, so a database leak doesn't hand out everyone's
 * keys. SHA-256 is enough because the secret is long and random; slow
 * password hashes exist for low-entropy, human-chosen passwords.
 */
export function hashOwnerSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

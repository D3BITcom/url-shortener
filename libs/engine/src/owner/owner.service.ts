import {
  generateOwnerSecret,
  hashOwnerSecret,
  isWellFormedOwnerSecret,
  type Owner,
  type OwnerRepository,
} from "./owner";

export interface OwnerSession {
  owner: Owner;
  /** The raw key. Only ever lives in the owner's cookie and secret link. */
  secret: string;
}

export class OwnerService {
  constructor(private readonly repository: OwnerRepository) {}

  /** The owner behind a secret key, or null for a missing, malformed or unknown key. */
  async authenticate(
    secret: string | null | undefined,
  ): Promise<OwnerSession | null> {
    if (!secret || !isWellFormedOwnerSecret(secret)) return null;
    const owner = await this.repository.findBySecretHash(
      hashOwnerSecret(secret),
    );
    return owner ? { owner, secret } : null;
  }

  /** Created lazily, the first time someone shortens a link. */
  async create(): Promise<OwnerSession> {
    const secret = generateOwnerSecret();
    const owner = await this.repository.create({
      secretHash: hashOwnerSecret(secret),
    });
    return { owner, secret };
  }

  async authenticateOrCreate(
    secret: string | null | undefined,
  ): Promise<OwnerSession & { created: boolean }> {
    const existing = await this.authenticate(secret);
    if (existing) return { ...existing, created: false };
    return { ...(await this.create()), created: true };
  }
}

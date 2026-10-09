import { describe, expect, it } from "vitest";
import {
  generateOwnerSecret,
  hashOwnerSecret,
  isWellFormedOwnerSecret,
  OwnerService,
  type Owner,
  type OwnerRepository,
} from "../src";

class InMemoryOwnerRepository implements OwnerRepository {
  readonly rows: (Owner & { secretHash: string })[] = [];

  async create({ secretHash }: { secretHash: string }): Promise<Owner> {
    const row = {
      id: `owner-${this.rows.length + 1}`,
      createdAt: new Date(),
      accountId: null,
      secretHash,
    };
    this.rows.push(row);
    return row;
  }

  async findBySecretHash(secretHash: string): Promise<Owner | null> {
    return this.rows.find((r) => r.secretHash === secretHash) ?? null;
  }
}

describe("owner secrets", () => {
  it("are long, random and recognisable", () => {
    const secrets = new Set(Array.from({ length: 1000 }, generateOwnerSecret));

    expect(secrets.size).toBe(1000);
    for (const secret of secrets)
      expect(isWellFormedOwnerSecret(secret)).toBe(true);
  });

  it("are stored only as a hash", () => {
    const secret = generateOwnerSecret();

    expect(hashOwnerSecret(secret)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOwnerSecret(secret)).not.toContain(secret);
  });
});

describe("OwnerService", () => {
  it("creates an owner and authenticates it with the same key later", async () => {
    const repository = new InMemoryOwnerRepository();
    const service = new OwnerService(repository);

    const { owner, secret } = await service.create();

    expect(repository.rows[0].secretHash).not.toBe(secret);
    expect(await service.authenticate(secret)).toEqual({ owner, secret });
  });

  it("rejects unknown, malformed and missing keys", async () => {
    const service = new OwnerService(new InMemoryOwnerRepository());

    expect(await service.authenticate(generateOwnerSecret())).toBeNull();
    expect(await service.authenticate("k_short")).toBeNull();
    expect(await service.authenticate(null)).toBeNull();
  });

  it("reuses the owner behind a valid key, otherwise creates one", async () => {
    const repository = new InMemoryOwnerRepository();
    const service = new OwnerService(repository);
    const first = await service.authenticateOrCreate(undefined);

    const again = await service.authenticateOrCreate(first.secret);

    expect(first.created).toBe(true);
    expect(again).toMatchObject({ created: false, owner: first.owner });
    expect(repository.rows).toHaveLength(1);
  });
});

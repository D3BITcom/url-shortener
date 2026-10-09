import type { Owner, OwnerRepository } from "@url-shortener/engine";
import type { PrismaClient } from "./generated/prisma/client";

export class PrismaOwnerRepository implements OwnerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create({ secretHash }: { secretHash: string }): Promise<Owner> {
    const { secretHash: _hash, ...owner } = await this.prisma.owner.create({
      data: { secretHash },
    });
    return owner;
  }

  async findBySecretHash(secretHash: string): Promise<Owner | null> {
    return this.prisma.owner.findUnique({
      where: { secretHash },
      select: { id: true, createdAt: true, accountId: true },
    });
  }
}

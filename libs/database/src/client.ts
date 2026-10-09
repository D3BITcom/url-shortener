import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

export type { PrismaClient };

/**
 * The only SQLite-specific code in the app. To switch databases, change the
 * driver adapter here and the `provider` in schema.prisma (see CONTRIBUTING.md).
 */
export async function connectDatabase(
  databaseUrl: string,
): Promise<PrismaClient> {
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });

  // WAL lets redirects (writes) and stats pages (reads) run without blocking
  // each other. The setting is stored in the database file.
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");

  return prisma;
}

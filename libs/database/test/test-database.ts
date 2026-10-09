import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectDatabase, type PrismaClient } from "../src";

/**
 * A throwaway SQLite database migrated with the real migrations, so these
 * tests also prove the migration history applies cleanly from scratch.
 */
export async function createTestDatabase(): Promise<{
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}> {
  const dir = mkdtempSync(join(tmpdir(), "url-shortener-db-"));
  const url = `file:${join(dir, "test.db")}`;

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: join(import.meta.dirname, ".."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  const prisma = await connectDatabase(url);
  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

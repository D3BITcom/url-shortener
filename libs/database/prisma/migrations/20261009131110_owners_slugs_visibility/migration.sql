-- Owners, custom slugs, visibility and admin hiding.
--
-- Hand-edited: existing rows get codeKey = lower(code) during the table copy
-- (Prisma can't infer that backfill). Pre-existing links have no owner and
-- stay private, so only admins see their stats.
-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secretHash" TEXT NOT NULL,
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShortUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isCustomSlug" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" DATETIME,
    CONSTRAINT "ShortUrl_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShortUrl" ("code", "codeKey", "createdAt", "id", "targetUrl") SELECT "code", lower("code"), "createdAt", "id", "targetUrl" FROM "ShortUrl";
DROP TABLE "ShortUrl";
ALTER TABLE "new_ShortUrl" RENAME TO "ShortUrl";
CREATE UNIQUE INDEX "ShortUrl_codeKey_key" ON "ShortUrl"("codeKey");
CREATE INDEX "ShortUrl_ownerId_createdAt_idx" ON "ShortUrl"("ownerId", "createdAt");
CREATE INDEX "ShortUrl_createdAt_idx" ON "ShortUrl"("createdAt");
CREATE INDEX "ShortUrl_isPublic_hiddenAt_idx" ON "ShortUrl"("isPublic", "hiddenAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_secretHash_key" ON "Owner"("secretHash");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_accountId_key" ON "Owner"("accountId");

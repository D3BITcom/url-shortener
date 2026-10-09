-- CreateTable
CREATE TABLE "ShortUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortUrlId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "country" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT NOT NULL,
    "referrerHost" TEXT,
    "visitorId" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Click_shortUrlId_fkey" FOREIGN KEY ("shortUrlId") REFERENCES "ShortUrl" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortUrl_code_key" ON "ShortUrl"("code");

-- CreateIndex
CREATE INDEX "ShortUrl_targetUrl_idx" ON "ShortUrl"("targetUrl");

-- CreateIndex
CREATE INDEX "ShortUrl_createdAt_idx" ON "ShortUrl"("createdAt");

-- CreateIndex
CREATE INDEX "Click_shortUrlId_isBot_day_idx" ON "Click"("shortUrlId", "isBot", "day");

-- CreateIndex
CREATE INDEX "Click_shortUrlId_occurredAt_idx" ON "Click"("shortUrlId", "occurredAt");

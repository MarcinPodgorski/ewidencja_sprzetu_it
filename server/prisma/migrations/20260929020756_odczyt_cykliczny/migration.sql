-- CreateTable
CREATE TABLE "odczyt_agenci" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "computerId" INTEGER,
    "aktywny" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ostatnioAt" DATETIME,
    "hostname" TEXT,
    CONSTRAINT "odczyt_agenci_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_odczyty_sprzetu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kodId" INTEGER,
    "agentId" INTEGER,
    "zrodlo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOWY',
    "computerId" INTEGER,
    "dopasowanie" TEXT,
    "hostname" TEXT,
    "numerSeryjny" TEXT,
    "dane" TEXT NOT NULL,
    "otrzymanoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rozpatrzonoAt" DATETIME,
    "rozpatrzylAppUserId" INTEGER,
    CONSTRAINT "odczyty_sprzetu_kodId_fkey" FOREIGN KEY ("kodId") REFERENCES "odczyt_kody" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "odczyty_sprzetu_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "odczyt_agenci" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "odczyty_sprzetu_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "odczyty_sprzetu_rozpatrzylAppUserId_fkey" FOREIGN KEY ("rozpatrzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_odczyty_sprzetu" ("computerId", "dane", "dopasowanie", "hostname", "id", "kodId", "numerSeryjny", "otrzymanoAt", "rozpatrzonoAt", "rozpatrzylAppUserId", "status", "zrodlo") SELECT "computerId", "dane", "dopasowanie", "hostname", "id", "kodId", "numerSeryjny", "otrzymanoAt", "rozpatrzonoAt", "rozpatrzylAppUserId", "status", "zrodlo" FROM "odczyty_sprzetu";
DROP TABLE "odczyty_sprzetu";
ALTER TABLE "new_odczyty_sprzetu" RENAME TO "odczyty_sprzetu";
CREATE INDEX "odczyty_sprzetu_status_idx" ON "odczyty_sprzetu"("status");
CREATE INDEX "odczyty_sprzetu_computerId_idx" ON "odczyty_sprzetu"("computerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "odczyt_agenci_token_key" ON "odczyt_agenci"("token");

-- CreateIndex
CREATE INDEX "odczyt_agenci_computerId_idx" ON "odczyt_agenci"("computerId");


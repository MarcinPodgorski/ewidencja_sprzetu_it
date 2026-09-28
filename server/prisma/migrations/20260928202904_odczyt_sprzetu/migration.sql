-- CreateTable
CREATE TABLE "odczyt_kody" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kod" TEXT NOT NULL,
    "computerId" INTEGER,
    "wygasaAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utworzylAppUserId" INTEGER,
    CONSTRAINT "odczyt_kody_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "odczyt_kody_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "odczyty_sprzetu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kodId" INTEGER,
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
    CONSTRAINT "odczyty_sprzetu_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "odczyty_sprzetu_rozpatrzylAppUserId_fkey" FOREIGN KEY ("rozpatrzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "odczyt_kody_kod_key" ON "odczyt_kody"("kod");

-- CreateIndex
CREATE INDEX "odczyt_kody_computerId_idx" ON "odczyt_kody"("computerId");

-- CreateIndex
CREATE INDEX "odczyty_sprzetu_status_idx" ON "odczyty_sprzetu"("status");

-- CreateIndex
CREATE INDEX "odczyty_sprzetu_computerId_idx" ON "odczyty_sprzetu"("computerId");


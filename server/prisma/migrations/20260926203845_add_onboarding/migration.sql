-- AlterTable
ALTER TABLE "employees" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "oprogramowanie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "wingetId" TEXT NOT NULL,
    "opis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "profile_oprogramowania" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "opis" TEXT,
    "dzialId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profile_oprogramowania_dzialId_fkey" FOREIGN KEY ("dzialId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profil_oprogramowania_pozycje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profilId" INTEGER NOT NULL,
    "oprogramowanieId" INTEGER NOT NULL,
    CONSTRAINT "profil_oprogramowania_pozycje_profilId_fkey" FOREIGN KEY ("profilId") REFERENCES "profile_oprogramowania" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "profil_oprogramowania_pozycje_oprogramowanieId_fkey" FOREIGN KEY ("oprogramowanieId") REFERENCES "oprogramowanie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ustawienia_onboardingu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "komunikatTytul" TEXT NOT NULL DEFAULT '',
    "komunikatTresc" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "onboarding_sesje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "computerId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "tryb" TEXT NOT NULL,
    "konfiguracja" TEXT NOT NULL,
    "wygasaAt" DATETIME NOT NULL,
    "pobranoAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utworzylAppUserId" INTEGER,
    CONSTRAINT "onboarding_sesje_computerId_fkey" FOREIGN KEY ("computerId") REFERENCES "computers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "onboarding_sesje_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "onboarding_sesje_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "oprogramowanie_wingetId_key" ON "oprogramowanie"("wingetId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_oprogramowania_nazwa_key" ON "profile_oprogramowania"("nazwa");

-- CreateIndex
CREATE UNIQUE INDEX "profil_oprogramowania_pozycje_profilId_oprogramowanieId_key" ON "profil_oprogramowania_pozycje"("profilId", "oprogramowanieId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sesje_token_key" ON "onboarding_sesje"("token");

-- CreateIndex
CREATE INDEX "onboarding_sesje_computerId_idx" ON "onboarding_sesje"("computerId");

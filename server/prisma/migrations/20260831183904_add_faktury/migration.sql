-- CreateTable
CREATE TABLE "faktury" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numer" TEXT NOT NULL,
    "numerKsef" TEXT,
    "kwotaGrosze" INTEGER NOT NULL,
    "plikPdf" TEXT,
    "plikXml" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "faktura_pozycje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fakturaId" INTEGER NOT NULL,
    "sprzetTyp" TEXT NOT NULL,
    "sprzetId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faktura_pozycje_fakturaId_fkey" FOREIGN KEY ("fakturaId") REFERENCES "faktury" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_computers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "cpu" TEXT NOT NULL,
    "ramIloscGb" INTEGER NOT NULL,
    "ramRodzaj" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "pojemnoscDysku" TEXT NOT NULL,
    "macEthernet" TEXT,
    "macWifi" TEXT,
    "notatki" TEXT,
    "dataZakupu" DATETIME,
    "dataKoncaGwarancji" DATETIME,
    "kosztBruttoGrosze" INTEGER,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "computers_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_computers" ("aktualnyUzytkownikId", "cpu", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "id", "kosztBruttoGrosze", "macEthernet", "macWifi", "markaModel", "notatki", "numerEwidencyjny", "numerSeryjny", "pojemnoscDysku", "ramIloscGb", "ramRodzaj", "typ", "updatedAt", "wycofany") SELECT "aktualnyUzytkownikId", "cpu", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "id", "kosztBruttoGrosze", "macEthernet", "macWifi", "markaModel", "notatki", "numerEwidencyjny", "numerSeryjny", "pojemnoscDysku", "ramIloscGb", "ramRodzaj", "typ", "updatedAt", "wycofany" FROM "computers";
DROP TABLE "computers";
ALTER TABLE "new_computers" RENAME TO "computers";
CREATE UNIQUE INDEX "computers_numerEwidencyjny_key" ON "computers"("numerEwidencyjny");
CREATE INDEX "computers_aktualnyUzytkownikId_idx" ON "computers"("aktualnyUzytkownikId");
CREATE TABLE "new_phones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "kodOdblokowania" TEXT,
    "dataZakupu" DATETIME,
    "dataKoncaGwarancji" DATETIME,
    "kosztBruttoGrosze" INTEGER,
    "simCardId" INTEGER,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "phones_simCardId_fkey" FOREIGN KEY ("simCardId") REFERENCES "sim_cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "phones_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_phones" ("aktualnyUzytkownikId", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "id", "imei", "kodOdblokowania", "kosztBruttoGrosze", "markaModel", "numerEwidencyjny", "numerSeryjny", "simCardId", "typ", "updatedAt", "wycofany") SELECT "aktualnyUzytkownikId", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "id", "imei", "kodOdblokowania", "kosztBruttoGrosze", "markaModel", "numerEwidencyjny", "numerSeryjny", "simCardId", "typ", "updatedAt", "wycofany" FROM "phones";
DROP TABLE "phones";
ALTER TABLE "new_phones" RENAME TO "phones";
CREATE UNIQUE INDEX "phones_numerEwidencyjny_key" ON "phones"("numerEwidencyjny");
CREATE UNIQUE INDEX "phones_simCardId_key" ON "phones"("simCardId");
CREATE INDEX "phones_aktualnyUzytkownikId_idx" ON "phones"("aktualnyUzytkownikId");
CREATE TABLE "new_printers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "dzialPietroMiejsce" TEXT NOT NULL,
    "adresIP" TEXT,
    "mac" TEXT,
    "dataZakupu" DATETIME,
    "dataKoncaGwarancji" DATETIME,
    "kosztBruttoGrosze" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_printers" ("adresIP", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "dzialPietroMiejsce", "id", "kosztBruttoGrosze", "mac", "markaModel", "numerEwidencyjny", "numerSeryjny", "updatedAt", "wycofany") SELECT "adresIP", "createdAt", "dataKoncaGwarancji", "dataWycofania", "dataZakupu", "dzialPietroMiejsce", "id", "kosztBruttoGrosze", "mac", "markaModel", "numerEwidencyjny", "numerSeryjny", "updatedAt", "wycofany" FROM "printers";
DROP TABLE "printers";
ALTER TABLE "new_printers" RENAME TO "printers";
CREATE UNIQUE INDEX "printers_numerEwidencyjny_key" ON "printers"("numerEwidencyjny");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "faktura_pozycje_sprzetTyp_sprzetId_idx" ON "faktura_pozycje"("sprzetTyp", "sprzetId");

-- CreateIndex
CREATE UNIQUE INDEX "faktura_pozycje_fakturaId_sprzetTyp_sprzetId_key" ON "faktura_pozycje"("fakturaId", "sprzetTyp", "sprzetId");


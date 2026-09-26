-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_oprogramowanie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "zrodlo" TEXT NOT NULL DEFAULT 'WINGET',
    "wingetId" TEXT,
    "plik" TEXT,
    "plikNazwa" TEXT,
    "plikRozmiar" INTEGER,
    "plikSha256" TEXT,
    "argumenty" TEXT,
    "opis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_oprogramowanie" ("createdAt", "id", "nazwa", "opis", "updatedAt", "wingetId") SELECT "createdAt", "id", "nazwa", "opis", "updatedAt", "wingetId" FROM "oprogramowanie";
DROP TABLE "oprogramowanie";
ALTER TABLE "new_oprogramowanie" RENAME TO "oprogramowanie";
CREATE UNIQUE INDEX "oprogramowanie_wingetId_key" ON "oprogramowanie"("wingetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

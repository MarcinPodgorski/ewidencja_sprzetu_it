-- CreateTable
CREATE TABLE "inwentaryzacje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "dzialId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OTWARTA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zamknietaAt" DATETIME,
    "utworzylAppUserId" INTEGER,
    CONSTRAINT "inwentaryzacje_dzialId_fkey" FOREIGN KEY ("dzialId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inwentaryzacje_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inwentaryzacja_pozycje" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inwentaryzacjaId" INTEGER NOT NULL,
    "sprzetTyp" TEXT NOT NULL,
    "sprzetId" INTEGER NOT NULL,
    "identyfikator" TEXT NOT NULL,
    "opis" TEXT,
    "uzytkownik" TEXT,
    "dzial" TEXT,
    "spozaListy" BOOLEAN NOT NULL DEFAULT false,
    "potwierdzonoAt" DATETIME,
    "potwierdzilAppUserId" INTEGER,
    "uwagi" TEXT,
    CONSTRAINT "inwentaryzacja_pozycje_inwentaryzacjaId_fkey" FOREIGN KEY ("inwentaryzacjaId") REFERENCES "inwentaryzacje" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inwentaryzacja_pozycje_potwierdzilAppUserId_fkey" FOREIGN KEY ("potwierdzilAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "inwentaryzacje_status_idx" ON "inwentaryzacje"("status");

-- CreateIndex
CREATE INDEX "inwentaryzacja_pozycje_sprzetTyp_sprzetId_idx" ON "inwentaryzacja_pozycje"("sprzetTyp", "sprzetId");

-- CreateIndex
CREATE UNIQUE INDEX "inwentaryzacja_pozycje_inwentaryzacjaId_sprzetTyp_sprzetId_key" ON "inwentaryzacja_pozycje"("inwentaryzacjaId", "sprzetTyp", "sprzetId");


-- CreateTable
CREATE TABLE "zmiany_danych" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "encja" TEXT NOT NULL,
    "encjaId" INTEGER NOT NULL,
    "operacja" TEXT NOT NULL,
    "zmiany" TEXT NOT NULL,
    "kontekst" TEXT,
    "appUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zmiany_danych_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "zmiany_danych_encja_encjaId_idx" ON "zmiany_danych"("encja", "encjaId");


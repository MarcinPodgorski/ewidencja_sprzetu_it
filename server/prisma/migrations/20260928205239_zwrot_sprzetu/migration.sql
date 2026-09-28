-- CreateTable
CREATE TABLE "zwroty_sprzetu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "odejscie" BOOLEAN NOT NULL DEFAULT false,
    "pozycje" TEXT NOT NULL,
    "pozostale" TEXT NOT NULL,
    "notatka" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utworzylAppUserId" INTEGER,
    CONSTRAINT "zwroty_sprzetu_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zwroty_sprzetu_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "zwroty_sprzetu_employeeId_idx" ON "zwroty_sprzetu"("employeeId");


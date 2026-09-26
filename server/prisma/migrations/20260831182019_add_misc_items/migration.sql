-- CreateTable
CREATE TABLE "misc_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "opis" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "misc_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "misc_items_employeeId_idx" ON "misc_items"("employeeId");

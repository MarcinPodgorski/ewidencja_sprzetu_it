-- CreateTable
CREATE TABLE "ustawienia_stanu_floty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "ukryteSekcje" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);


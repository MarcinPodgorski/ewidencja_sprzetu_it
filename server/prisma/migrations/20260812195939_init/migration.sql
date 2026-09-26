-- CreateTable
CREATE TABLE "departments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imie" TEXT NOT NULL,
    "nazwisko" TEXT NOT NULL,
    "stanowisko" TEXT NOT NULL,
    "dzialId" INTEGER NOT NULL,
    "aktywny" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "employees_dzialId_fkey" FOREIGN KEY ("dzialId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imie" TEXT NOT NULL,
    "nazwisko" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "hasloHash" TEXT NOT NULL,
    "rola" TEXT NOT NULL,
    "aktywny" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "computers" (
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
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "computers_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monitors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "zlacza" TEXT NOT NULL,
    "proporcjeEkranu" TEXT NOT NULL,
    "wielkoscEkranu" REAL NOT NULL,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "monitors_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "czyZestaw" BOOLEAN NOT NULL DEFAULT false,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mice_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "keyboards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "czyZestaw" BOOLEAN NOT NULL DEFAULT false,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "keyboards_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "peripheral_pairs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mouseId" INTEGER NOT NULL,
    "keyboardId" INTEGER NOT NULL,
    CONSTRAINT "peripheral_pairs_mouseId_fkey" FOREIGN KEY ("mouseId") REFERENCES "mice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "peripheral_pairs_keyboardId_fkey" FOREIGN KEY ("keyboardId") REFERENCES "keyboards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "phones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "kodOdblokowania" TEXT,
    "simCardId" INTEGER,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "phones_simCardId_fkey" FOREIGN KEY ("simCardId") REFERENCES "sim_cards" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "phones_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sim_cards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "iccid" TEXT NOT NULL,
    "numerTelefonu" TEXT NOT NULL,
    "pin1" TEXT,
    "pin2" TEXT,
    "puk1" TEXT,
    "puk2" TEXT,
    "taryfa" TEXT NOT NULL,
    "kosztMiesiecznyGrosze" INTEGER NOT NULL,
    "dataKoncaUmowy" DATETIME NOT NULL,
    "aktualnyUzytkownikId" INTEGER,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sim_cards_aktualnyUzytkownikId_fkey" FOREIGN KEY ("aktualnyUzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "printers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numerEwidencyjny" TEXT NOT NULL,
    "numerSeryjny" TEXT NOT NULL,
    "markaModel" TEXT NOT NULL,
    "dzialPietroMiejsce" TEXT NOT NULL,
    "adresIP" TEXT,
    "mac" TEXT,
    "wycofany" BOOLEAN NOT NULL DEFAULT false,
    "dataWycofania" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "toners" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "oznaczenie" TEXT NOT NULL,
    "ilosc" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "printer_toners" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "printerId" INTEGER NOT NULL,
    "tonerId" INTEGER NOT NULL,
    CONSTRAINT "printer_toners_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "printer_toners_tonerId_fkey" FOREIGN KEY ("tonerId") REFERENCES "toners" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assignment_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sprzetTyp" TEXT NOT NULL,
    "sprzetId" INTEGER NOT NULL,
    "uzytkownikId" INTEGER,
    "lokalizacja" TEXT,
    "dataOd" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataDo" DATETIME,
    "notatka" TEXT,
    "utworzylAppUserId" INTEGER,
    CONSTRAINT "assignment_history_uzytkownikId_fkey" FOREIGN KEY ("uzytkownikId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "assignment_history_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_lists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "dzialId" INTEGER NOT NULL,
    "opis" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utworzylAppUserId" INTEGER NOT NULL,
    CONSTRAINT "equipment_lists_dzialId_fkey" FOREIGN KEY ("dzialId") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_lists_utworzylAppUserId_fkey" FOREIGN KEY ("utworzylAppUserId") REFERENCES "app_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_list_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listId" INTEGER NOT NULL,
    "sprzetTyp" TEXT NOT NULL,
    "sprzetId" INTEGER NOT NULL,
    "dodanoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dodalAppUserId" INTEGER,
    CONSTRAINT "equipment_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "equipment_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "equipment_list_items_dodalAppUserId_fkey" FOREIGN KEY ("dodalAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_list_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listId" INTEGER NOT NULL,
    "appUserId" INTEGER NOT NULL,
    "poziom" TEXT NOT NULL,
    "nadanoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nadalAppUserId" INTEGER,
    CONSTRAINT "equipment_list_permissions_listId_fkey" FOREIGN KEY ("listId") REFERENCES "equipment_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "equipment_list_permissions_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_list_permissions_nadalAppUserId_fkey" FOREIGN KEY ("nadalAppUserId") REFERENCES "app_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_nazwa_key" ON "departments"("nazwa");

-- CreateIndex
CREATE INDEX "employees_dzialId_idx" ON "employees"("dzialId");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_login_key" ON "app_users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "computers_numerEwidencyjny_key" ON "computers"("numerEwidencyjny");

-- CreateIndex
CREATE INDEX "computers_aktualnyUzytkownikId_idx" ON "computers"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "monitors_numerEwidencyjny_key" ON "monitors"("numerEwidencyjny");

-- CreateIndex
CREATE INDEX "monitors_aktualnyUzytkownikId_idx" ON "monitors"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "mice_numerEwidencyjny_key" ON "mice"("numerEwidencyjny");

-- CreateIndex
CREATE INDEX "mice_aktualnyUzytkownikId_idx" ON "mice"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "keyboards_numerEwidencyjny_key" ON "keyboards"("numerEwidencyjny");

-- CreateIndex
CREATE INDEX "keyboards_aktualnyUzytkownikId_idx" ON "keyboards"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "peripheral_pairs_mouseId_key" ON "peripheral_pairs"("mouseId");

-- CreateIndex
CREATE UNIQUE INDEX "peripheral_pairs_keyboardId_key" ON "peripheral_pairs"("keyboardId");

-- CreateIndex
CREATE UNIQUE INDEX "phones_numerEwidencyjny_key" ON "phones"("numerEwidencyjny");

-- CreateIndex
CREATE UNIQUE INDEX "phones_simCardId_key" ON "phones"("simCardId");

-- CreateIndex
CREATE INDEX "phones_aktualnyUzytkownikId_idx" ON "phones"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "sim_cards_iccid_key" ON "sim_cards"("iccid");

-- CreateIndex
CREATE INDEX "sim_cards_aktualnyUzytkownikId_idx" ON "sim_cards"("aktualnyUzytkownikId");

-- CreateIndex
CREATE UNIQUE INDEX "printers_numerEwidencyjny_key" ON "printers"("numerEwidencyjny");

-- CreateIndex
CREATE UNIQUE INDEX "printer_toners_printerId_tonerId_key" ON "printer_toners"("printerId", "tonerId");

-- CreateIndex
CREATE INDEX "assignment_history_sprzetTyp_sprzetId_idx" ON "assignment_history"("sprzetTyp", "sprzetId");

-- CreateIndex
CREATE INDEX "assignment_history_uzytkownikId_idx" ON "assignment_history"("uzytkownikId");

-- CreateIndex
CREATE INDEX "equipment_lists_dzialId_idx" ON "equipment_lists"("dzialId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_list_items_listId_sprzetTyp_sprzetId_key" ON "equipment_list_items"("listId", "sprzetTyp", "sprzetId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_list_permissions_listId_appUserId_key" ON "equipment_list_permissions"("listId", "appUserId");

-- AlterTable
ALTER TABLE "computers" ADD COLUMN "dataKoncaGwarancji" DATETIME;
ALTER TABLE "computers" ADD COLUMN "dataZakupu" DATETIME;
ALTER TABLE "computers" ADD COLUMN "kosztBruttoGrosze" INTEGER;
ALTER TABLE "computers" ADD COLUMN "numerFaktury" TEXT;

-- AlterTable
ALTER TABLE "phones" ADD COLUMN "dataKoncaGwarancji" DATETIME;
ALTER TABLE "phones" ADD COLUMN "dataZakupu" DATETIME;
ALTER TABLE "phones" ADD COLUMN "kosztBruttoGrosze" INTEGER;
ALTER TABLE "phones" ADD COLUMN "numerFaktury" TEXT;

-- AlterTable
ALTER TABLE "printers" ADD COLUMN "dataKoncaGwarancji" DATETIME;
ALTER TABLE "printers" ADD COLUMN "dataZakupu" DATETIME;
ALTER TABLE "printers" ADD COLUMN "kosztBruttoGrosze" INTEGER;
ALTER TABLE "printers" ADD COLUMN "numerFaktury" TEXT;

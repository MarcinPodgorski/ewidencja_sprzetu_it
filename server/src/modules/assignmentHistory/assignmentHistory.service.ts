import type { EquipmentType } from 'shared';
import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';

/** Nazwy delegatów Prisma dla typów sprzętu, które mają pole `aktualnyUzytkownikId`
 *  (wszystkie oprócz drukarki — ta ma lokalizację zamiast osoby). */
export type AssignableModelName = 'computer' | 'monitor' | 'mouse' | 'keyboard' | 'phone' | 'simCard';

export async function getHistory(sprzetTyp: EquipmentType, sprzetId: number) {
  return prisma.assignmentHistory.findMany({
    where: { sprzetTyp, sprzetId },
    include: {
      uzytkownik: { include: { dzial: true } },
      utworzylAppUser: { select: { id: true, imie: true, nazwisko: true, login: true } },
    },
    orderBy: { dataOd: 'desc' },
  });
}

interface AssignParams {
  sprzetTyp: EquipmentType;
  sprzetId: number;
  employeeId: number;
  notatka?: string | null;
  actorAppUserId: number;
  modelName: AssignableModelName;
}

/** Przypisuje sprzęt do pracownika: zamyka ewentualny otwarty wpis historii, otwiera
 *  nowy i aktualizuje `aktualnyUzytkownikId` na encji sprzętu — w jednej transakcji. */
export async function assign(params: AssignParams) {
  const { sprzetTyp, sprzetId, employeeId, notatka, actorAppUserId, modelName } = params;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.aktywny) {
    throw new AppError(400, 'Wybrany pracownik nie istnieje lub jest nieaktywny');
  }

  return prisma.$transaction(async (tx) => {
    await tx.assignmentHistory.updateMany({
      where: { sprzetTyp, sprzetId, dataDo: null },
      data: { dataDo: new Date() },
    });
    await tx.assignmentHistory.create({
      data: {
        sprzetTyp,
        sprzetId,
        uzytkownikId: employeeId,
        notatka: notatka ?? null,
        utworzylAppUserId: actorAppUserId,
      },
    });
    return (tx as any)[modelName].update({
      where: { id: sprzetId },
      data: { aktualnyUzytkownikId: employeeId },
      include: { aktualnyUzytkownik: { include: { dzial: true } } },
    });
  });
}

interface UnassignParams {
  sprzetTyp: EquipmentType;
  sprzetId: number;
  notatka?: string | null;
  actorAppUserId: number;
  modelName: AssignableModelName;
}

export async function unassign(params: UnassignParams) {
  const { sprzetTyp, sprzetId, notatka, actorAppUserId, modelName } = params;

  return prisma.$transaction(async (tx) => {
    const openEntry = await tx.assignmentHistory.findFirst({
      where: { sprzetTyp, sprzetId, dataDo: null },
    });
    if (!openEntry) {
      throw new AppError(409, 'Ten sprzęt nie jest aktualnie przypisany do żadnego pracownika');
    }
    await tx.assignmentHistory.update({
      where: { id: openEntry.id },
      data: { dataDo: new Date(), notatka: notatka ?? openEntry.notatka, utworzylAppUserId: actorAppUserId },
    });
    return (tx as any)[modelName].update({
      where: { id: sprzetId },
      data: { aktualnyUzytkownikId: null },
    });
  });
}

interface RelocatePrinterParams {
  sprzetId: number;
  lokalizacja: string;
  actorAppUserId: number;
}

/** Odpowiednik assign/unassign dla drukarki — śledzi zmianę lokalizacji, nie osoby. */
export async function relocatePrinter(params: RelocatePrinterParams) {
  const { sprzetId, lokalizacja, actorAppUserId } = params;

  return prisma.$transaction(async (tx) => {
    await tx.assignmentHistory.updateMany({
      where: { sprzetTyp: 'DRUKARKA', sprzetId, dataDo: null },
      data: { dataDo: new Date() },
    });
    await tx.assignmentHistory.create({
      data: { sprzetTyp: 'DRUKARKA', sprzetId, lokalizacja, utworzylAppUserId: actorAppUserId },
    });
    return tx.printer.update({ where: { id: sprzetId }, data: { dzialPietroMiejsce: lokalizacja } });
  });
}

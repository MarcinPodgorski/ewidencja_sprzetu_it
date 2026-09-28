import type { Request, Response } from 'express';
import PdfPrinter from 'pdfmake';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPES, idParamSchema, zwrotSprzetuSchema, type EquipmentType } from 'shared';
import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';
import { fontDescriptors } from '../../pdf/fonts';
import { buildProtocolDocDefinition, type ProtocolItem } from '../../pdf/protocolTemplate';
import { getEquipmentDelegate } from '../equipment/equipmentLookup';
import type { AssignableModelName } from '../assignmentHistory/assignmentHistory.service';

/** Typy sprzętu, które mogą mieć bieżącego użytkownika (wszystkie oprócz drukarki). */
export const ASSIGNABLE_TYPES = EQUIPMENT_TYPES.filter((t): t is Exclude<EquipmentType, 'DRUKARKA'> => t !== 'DRUKARKA');

const MODELE: Record<Exclude<EquipmentType, 'DRUKARKA'>, AssignableModelName> = {
  KOMPUTER: 'computer',
  MONITOR: 'monitor',
  MYSZ: 'mouse',
  KLAWIATURA: 'keyboard',
  TELEFON: 'phone',
  KARTA_SIM: 'simCard',
};

/** Aktywny (niewycofany) sprzęt przypisany do pracownika — wszystkie typy naraz. */
export async function sprzetPracownika(employeeId: number) {
  const perType = await Promise.all(
    ASSIGNABLE_TYPES.map(async (sprzetTyp) => {
      const rows = await getEquipmentDelegate(sprzetTyp).findMany({ where: { aktualnyUzytkownikId: employeeId, wycofany: false } });
      return rows.map((row: Record<string, unknown> & { id: number }) => ({ sprzetTyp, ...row }));
    }),
  );
  return perType.flat();
}

/** Pozycja protokołu zwrotu zapisywana w migawce (bez numeru porządkowego). */
type PozycjaMigawki = Omit<ProtocolItem, 'lp'>;

function migawkaSprzetu(pozycja: Record<string, unknown> & { sprzetTyp: EquipmentType }, uwagi?: string | null): PozycjaMigawki {
  const sim = pozycja.sprzetTyp === 'KARTA_SIM';
  return {
    typ: EQUIPMENT_TYPE_LABELS[pozycja.sprzetTyp],
    identyfikator: String(sim ? pozycja.iccid : pozycja.numerEwidencyjny),
    numerSeryjny: sim ? null : ((pozycja.numerSeryjny as string | null) ?? null),
    markaModel: sim ? `${pozycja.taryfa} • ${pozycja.numerTelefonu}` : ((pozycja.markaModel as string | null) ?? null),
    uwagi: uwagi?.trim() || null,
  };
}

function migawkaRoznych(opis: string, uwagi?: string | null): PozycjaMigawki {
  return { typ: 'Różne', identyfikator: opis, numerSeryjny: null, markaModel: null, uwagi: uwagi?.trim() || null };
}

const klucz = (sprzetTyp: string, id: number) => `${sprzetTyp}:${id}`;

function serializujZwrot(zwrot: {
  id: number;
  employeeId: number;
  odejscie: boolean;
  pozycje: string;
  pozostale: string;
  notatka: string | null;
  createdAt: Date;
  utworzylAppUser?: { id: number; login: string } | null;
}) {
  return {
    ...zwrot,
    pozycje: JSON.parse(zwrot.pozycje) as PozycjaMigawki[],
    pozostale: JSON.parse(zwrot.pozostale) as PozycjaMigawki[],
  };
}

/** POST /employees/:id/zwrot — zwrot wybranych pozycji (opcjonalnie z dezaktywacją pracownika). */
export async function zapiszZwrot(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const dane = zwrotSprzetuSchema.parse(req.body);
  const pracownik = await prisma.employee.findUnique({ where: { id } });
  if (!pracownik) throw new AppError(404, 'Nie znaleziono pracownika');
  if (dane.pozycje.length + dane.rozne.length === 0 && !dane.dezaktywuj) {
    throw new AppError(400, 'Zaznacz co najmniej jedną zwracaną pozycję');
  }

  // Wszystko, co pracownik ma teraz: do sprawdzenia zaznaczonych pozycji i do migawki „pozostałych”.
  const przypisane = await sprzetPracownika(id);
  const przypisaneMapa = new Map(przypisane.map((p) => [klucz(p.sprzetTyp, p.id), p]));
  const rozne = await prisma.miscItem.findMany({ where: { employeeId: id }, orderBy: { createdAt: 'asc' } });
  const rozneMapa = new Map(rozne.map((r) => [r.id, r]));

  for (const pozycja of dane.pozycje) {
    if (!przypisaneMapa.has(klucz(pozycja.sprzetTyp, pozycja.sprzetId))) {
      throw new AppError(409, 'Część zaznaczonego sprzętu nie jest już przypisana do tego pracownika — odśwież stronę');
    }
  }
  for (const r of dane.rozne) {
    if (!rozneMapa.has(r.id)) throw new AppError(409, 'Jedna z pozycji „Różne” już nie istnieje — odśwież stronę');
  }

  const zwracane = new Set(dane.pozycje.map((p) => klucz(p.sprzetTyp, p.sprzetId)));
  const zwracaneRozne = new Set(dane.rozne.map((r) => r.id));
  const pozycje = [
    ...dane.pozycje.map((p) => migawkaSprzetu(przypisaneMapa.get(klucz(p.sprzetTyp, p.sprzetId))!, p.uwagi)),
    ...dane.rozne.map((r) => migawkaRoznych(rozneMapa.get(r.id)!.opis, r.uwagi)),
  ];
  const pozostale = [
    ...przypisane.filter((p) => !zwracane.has(klucz(p.sprzetTyp, p.id))).map((p) => migawkaSprzetu(p)),
    ...rozne.filter((r) => !zwracaneRozne.has(r.id)).map((r) => migawkaRoznych(r.opis)),
  ];
  const notatkaHistorii = dane.odejscie ? 'Zwrot przy odejściu pracownika' : 'Zwrot sprzętu';

  // Wszystko albo nic: zwrot pięciu rzeczy nie może skończyć się na trzech zdjętych przypisaniach.
  const zwrot = await prisma.$transaction(async (tx) => {
    const teraz = new Date();
    for (const pozycja of dane.pozycje) {
      const sprzetTyp = pozycja.sprzetTyp as Exclude<EquipmentType, 'DRUKARKA'>;
      await tx.assignmentHistory.updateMany({
        where: { sprzetTyp, sprzetId: pozycja.sprzetId, dataDo: null },
        data: { dataDo: teraz, notatka: notatkaHistorii, utworzylAppUserId: req.user!.id },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any)[MODELE[sprzetTyp]].update({ where: { id: pozycja.sprzetId }, data: { aktualnyUzytkownikId: null } });
    }
    if (dane.rozne.length > 0) {
      await tx.miscItem.deleteMany({ where: { id: { in: dane.rozne.map((r) => r.id) }, employeeId: id } });
    }
    if (dane.dezaktywuj) {
      await tx.employee.update({ where: { id }, data: { aktywny: false } });
    }
    // Sama dezaktywacja (pracownik nic nie miał albo nic nie oddał) — bez protokołu.
    if (pozycje.length === 0) return null;
    return tx.zwrotSprzetu.create({
      data: {
        employeeId: id,
        odejscie: dane.odejscie,
        pozycje: JSON.stringify(pozycje),
        pozostale: JSON.stringify(pozostale),
        notatka: dane.notatka?.trim() || null,
        utworzylAppUserId: req.user!.id,
      },
      include: { utworzylAppUser: { select: { id: true, login: true } } },
    });
  });

  res.status(201).json({ item: zwrot ? serializujZwrot(zwrot) : null });
}

/** GET /employees/:id/zwroty — protokoły zwrotu pracownika, najnowsze pierwsze. */
export async function listaZwrotow(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const zwroty = await prisma.zwrotSprzetu.findMany({
    where: { employeeId: id },
    include: { utworzylAppUser: { select: { id: true, login: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items: zwroty.map(serializujZwrot) });
}

/** Nazwa pliku bez polskich znaków — `filename=` z surowym UTF-8 bywa różnie obsługiwany. */
function nazwaPliku(wartosc: string): string {
  return wartosc.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/\s+/g, '-');
}

/** GET /employees/:id/zwroty/:zwrotId/protokol — protokół zwrotu w PDF (z migawki). */
export async function protokolZwrotu(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const zwrotId = Number(req.params.zwrotId);
  const zwrot = await prisma.zwrotSprzetu.findFirst({
    where: { id: zwrotId, employeeId: id },
    include: { employee: { include: { dzial: true } } },
  });
  if (!zwrot) throw new AppError(404, 'Nie znaleziono protokołu zwrotu');

  const numeruj = (lista: PozycjaMigawki[]): ProtocolItem[] => lista.map((p, i) => ({ lp: i + 1, ...p }));
  const { employee } = zwrot;
  const docDefinition = buildProtocolDocDefinition(
    { imie: employee.imie, nazwisko: employee.nazwisko, stanowisko: employee.stanowisko, dzial: employee.dzial.nazwa },
    numeruj(JSON.parse(zwrot.pozycje)),
    {
      tytul: 'Protokół zwrotu sprzętu',
      wstep: zwrot.odejscie
        ? 'W związku z zakończeniem współpracy pracownik zwraca wymieniony poniżej sprzęt służbowy.'
        : 'Pracownik zwraca wymieniony poniżej sprzęt służbowy.',
      podpisy: ['Zwracający', 'Przyjmujący'],
      data: zwrot.createdAt,
      notatka: zwrot.notatka,
      pozostale: {
        tytul: zwrot.odejscie ? 'Sprzęt niezwrócony' : 'Sprzęt, który pozostaje u pracownika',
        pozycje: numeruj(JSON.parse(zwrot.pozostale)),
      },
    },
  );

  const pdfDoc = new PdfPrinter(fontDescriptors).createPdfKitDocument(docDefinition);
  const filename = nazwaPliku(`protokol-zwrotu-${employee.nazwisko}-${employee.imie}-${zwrot.createdAt.toISOString().slice(0, 10)}.pdf`);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  pdfDoc.pipe(res);
  pdfDoc.end();
}

import type { EquipmentType } from 'shared';
import { EQUIPMENT_TYPES } from 'shared';
import { prisma } from '../../db/prisma';

/** Mapowanie typu sprzętu -> delegat Prisma odpowiedniej tabeli. */
const DELEGATES: Record<EquipmentType, any> = {
  KOMPUTER: prisma.computer,
  MONITOR: prisma.monitor,
  MYSZ: prisma.mouse,
  KLAWIATURA: prisma.keyboard,
  TELEFON: prisma.phone,
  DRUKARKA: prisma.printer,
  KARTA_SIM: prisma.simCard,
};

export function getEquipmentDelegate(sprzetTyp: EquipmentType) {
  return DELEGATES[sprzetTyp];
}

export interface EquipmentSummary {
  sprzetTyp: EquipmentType;
  sprzetId: number;
  /** Główny identyfikator wyświetlany w UI (nr ewidencyjny, dla karty SIM: ICCID). */
  identyfikator: string;
  /** Pomocniczy opis (marka/model, dla karty SIM: taryfa + numer telefonu). */
  opis: string | null;
  numerSeryjny: string | null;
  wycofany: boolean;
  aktualnyUzytkownik: { id: number; imie: string; nazwisko: string } | null;
}

function toSummary(sprzetTyp: EquipmentType, raw: any): EquipmentSummary | null {
  if (!raw) return null;

  const aktualnyUzytkownik = raw.aktualnyUzytkownik
    ? { id: raw.aktualnyUzytkownik.id, imie: raw.aktualnyUzytkownik.imie, nazwisko: raw.aktualnyUzytkownik.nazwisko }
    : null;

  if (sprzetTyp === 'KARTA_SIM') {
    return {
      sprzetTyp,
      sprzetId: raw.id,
      identyfikator: raw.iccid,
      opis: `${raw.taryfa} • ${raw.numerTelefonu}`,
      numerSeryjny: null,
      wycofany: raw.wycofany,
      aktualnyUzytkownik,
    };
  }

  if (sprzetTyp === 'DRUKARKA') {
    return {
      sprzetTyp,
      sprzetId: raw.id,
      identyfikator: raw.numerEwidencyjny,
      opis: raw.markaModel,
      numerSeryjny: raw.numerSeryjny,
      wycofany: raw.wycofany,
      aktualnyUzytkownik: null,
    };
  }

  return {
    sprzetTyp,
    sprzetId: raw.id,
    identyfikator: raw.numerEwidencyjny,
    opis: raw.markaModel,
    numerSeryjny: raw.numerSeryjny,
    wycofany: raw.wycofany,
    aktualnyUzytkownik,
  };
}

const SEARCH_FIELDS: Record<EquipmentType, string[]> = {
  KOMPUTER: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  MONITOR: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  MYSZ: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  KLAWIATURA: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  TELEFON: ['numerEwidencyjny', 'numerSeryjny', 'markaModel', 'imei'],
  DRUKARKA: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  KARTA_SIM: ['iccid', 'numerTelefonu'],
};

export async function getEquipmentSummary(
  sprzetTyp: EquipmentType,
  sprzetId: number,
): Promise<EquipmentSummary | null> {
  const delegate = getEquipmentDelegate(sprzetTyp);
  const raw = await delegate.findUnique({
    where: { id: sprzetId },
    include: sprzetTyp === 'DRUKARKA' ? undefined : { aktualnyUzytkownik: true },
  });
  return toSummary(sprzetTyp, raw);
}

/** Wyszukiwarka po wszystkich typach sprzętu naraz (albo po zawężonym podzbiorze —
 *  patrz `types`) — używana przez /equipment/search, np. do ręcznego dodawania pozycji
 *  do spisu, albo przypisywania istniejącego sprzętu do pracownika per kategoria. */
export async function searchEquipment(
  query: string,
  opts: { types?: EquipmentType[]; limit?: number } = {},
): Promise<EquipmentSummary[]> {
  const q = query.trim();
  const types = opts.types ?? EQUIPMENT_TYPES;
  const limit = opts.limit ?? 25;

  const perType = await Promise.all(
    types.map(async (sprzetTyp) => {
      const delegate = getEquipmentDelegate(sprzetTyp);
      const where: any = { wycofany: false };
      if (q) {
        where.OR = SEARCH_FIELDS[sprzetTyp].map((field) => ({ [field]: { contains: q } }));
      }
      const rows = await delegate.findMany({
        where,
        take: limit,
        include: sprzetTyp === 'DRUKARKA' ? undefined : { aktualnyUzytkownik: true },
        orderBy: { id: 'asc' },
      });
      return rows.map((row: any) => toSummary(sprzetTyp, row)!);
    }),
  );

  return perType.flat().slice(0, limit);
}

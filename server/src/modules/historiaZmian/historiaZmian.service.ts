import type { Prisma } from '@prisma/client';
import type { EncjaHistorii, OperacjaZmiany } from 'shared';
import { prisma } from '../../db/prisma';

/** Pola pomijane w dzienniku: techniczne, oraz te z własną historią (przypisania osób,
 *  lokalizacja drukarki) albo zapisane jako osobna operacja (wycofanie/przywrócenie). */
const POMIJANE = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'aktualnyUzytkownikId',
  'dzialPietroMiejsce',
  'wycofany',
  'dataWycofania',
  'dzialId',
]);

/** Dane wrażliwe — dziennik odnotowuje tylko, że się zmieniły, bez wartości. */
const WRAZLIWE = new Set(['pin1', 'pin2', 'puk1', 'puk2', 'kodOdblokowania']);
const MASKA = '••••';

export type WartoscZmiany = string | number | boolean | null;
export interface Zmiana {
  pole: string;
  przed: WartoscZmiany;
  po: WartoscZmiany;
}

/** undefined = to nie jest pole rekordu (relacja, obiekt) albo pole nieobecne — pomijamy. */
function normalizuj(wartosc: unknown): WartoscZmiany | undefined {
  if (wartosc === undefined) return undefined;
  if (wartosc === null || wartosc === '') return null;
  if (wartosc instanceof Date) return wartosc.toISOString();
  if (typeof wartosc === 'string' || typeof wartosc === 'number' || typeof wartosc === 'boolean') return wartosc;
  return undefined;
}

/** Różnice pole po polu; bez `przed` (utworzenie) — wszystkie niepuste pola nowego rekordu. */
export function roznice(przed: Record<string, unknown> | null, po: Record<string, unknown>): Zmiana[] {
  const zmiany: Zmiana[] = [];
  for (const [pole, surowePo] of Object.entries(po)) {
    if (POMIJANE.has(pole)) continue;
    const nowa = normalizuj(surowePo);
    if (nowa === undefined) continue;
    const stara = przed ? (normalizuj(przed[pole]) ?? null) : null;
    if (stara === nowa || (!przed && nowa === null)) continue;
    const maskuj = WRAZLIWE.has(pole);
    zmiany.push({ pole, przed: maskuj && stara !== null ? MASKA : stara, po: maskuj && nowa !== null ? MASKA : nowa });
  }
  return zmiany;
}

interface ZapiszZmianeParams {
  encja: EncjaHistorii;
  encjaId: number;
  operacja: OperacjaZmiany;
  przed?: Record<string, unknown> | null;
  po: Record<string, unknown>;
  appUserId?: number | null;
  /** Skąd przyszła zmiana, gdy nie ze zwykłego formularza (np. „odczyt sprzętu”, „import”). */
  kontekst?: string | null;
  /** Klient transakcji — wpis ma powstać razem ze zmianą albo wcale. */
  klient?: Prisma.TransactionClient;
}

export async function zapiszZmiane(p: ZapiszZmianeParams): Promise<void> {
  const bezPol = p.operacja === 'WYCOFANIE' || p.operacja === 'PRZYWROCENIE';
  const zmiany = bezPol ? [] : roznice(p.przed ?? null, p.po);
  // Zapis formularza bez faktycznych zmian nie zaśmieca historii.
  if (p.operacja === 'EDYCJA' && zmiany.length === 0) return;
  await (p.klient ?? prisma).zmianaDanych.create({
    data: {
      encja: p.encja,
      encjaId: p.encjaId,
      operacja: p.operacja,
      zmiany: JSON.stringify(zmiany),
      kontekst: p.kontekst ?? null,
      appUserId: p.appUserId ?? null,
    },
  });
}

/** Pracownik w dzienniku: nazwa działu zamiast jego ID (czytelniejsza historia). */
export function pracownikDoHistorii<T extends { dzial?: { nazwa: string } | null }>(pracownik: T) {
  return { ...pracownik, dzial: pracownik.dzial?.nazwa ?? null };
}

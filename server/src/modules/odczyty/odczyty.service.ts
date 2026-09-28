import type { Prisma } from '@prisma/client';
import { daneOdczytuSchema, type DaneOdczytu, type DopasowanieOdczytu, type ZrodloOdczytu } from 'shared';
import { prisma } from '../../db/prisma';
import { mapujOdczyt, normalizujMac } from './mapowanie';

/** Klucz porównania numerów seryjnych i nazw: bez spacji/myślników, wielkie litery. */
function klucz(wartosc: string | null | undefined): string {
  return (wartosc ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface Dopasowanie {
  computerId: number;
  dopasowanie: DopasowanieOdczytu;
}

/**
 * Szuka komputera w ewidencji: numer seryjny → nazwa komputera równa numerowi
 * ewidencyjnemu (skrypt onboardingu nadaje taką nazwę) → adres MAC. Komputerów jest
 * najwyżej kilkaset, więc porównanie w pamięci jest prostsze niż zapytania SQL
 * (SQLite nie ma porównania bez wielkości liter, a numery bywają wpisane z myślnikami).
 */
export async function dopasujKomputer(dane: DaneOdczytu): Promise<Dopasowanie | null> {
  const { propozycja } = mapujOdczyt(dane);
  const komputery = await prisma.computer.findMany({
    select: { id: true, numerEwidencyjny: true, numerSeryjny: true, macEthernet: true, macWifi: true, wycofany: true },
    // Aktywne przed wycofanymi — ten sam numer seryjny mógł wrócić po naprawie jako nowa pozycja.
    orderBy: [{ wycofany: 'asc' }, { id: 'asc' }],
  });

  const seryjny = klucz(propozycja.numerSeryjny);
  if (seryjny) {
    const znaleziony = komputery.find((k) => klucz(k.numerSeryjny) === seryjny);
    if (znaleziony) return { computerId: znaleziony.id, dopasowanie: 'NUMER_SERYJNY' };
  }

  const nazwa = klucz(dane.hostname);
  if (nazwa) {
    const znaleziony = komputery.find((k) => klucz(k.numerEwidencyjny) === nazwa);
    if (znaleziony) return { computerId: znaleziony.id, dopasowanie: 'NAZWA' };
  }

  const adresy = new Set(dane.karty.map((k) => normalizujMac(k.mac)).filter((m): m is string => m !== null));
  if (adresy.size > 0) {
    const znaleziony = komputery.find(
      (k) => [k.macEthernet, k.macWifi].some((m) => { const n = normalizujMac(m); return n !== null && adresy.has(n); }),
    );
    if (znaleziony) return { computerId: znaleziony.id, dopasowanie: 'MAC' };
  }
  return null;
}

interface ZapiszOdczytParams {
  dane: DaneOdczytu;
  zrodlo: ZrodloOdczytu;
  kodId?: number | null;
  /** Komputer znany z góry (kod przypięty do komputera albo sesja onboardingu). */
  wskazany?: Dopasowanie | null;
}

/** Zapisuje odczyt, dopasowuje komputer i zwraca komunikat do wyświetlenia w skrypcie. */
export async function zapiszOdczyt({ dane, zrodlo, kodId = null, wskazany = null }: ZapiszOdczytParams) {
  const dopasowanie = wskazany ?? (await dopasujKomputer(dane));
  const { propozycja } = mapujOdczyt(dane);

  const odczyt = await prisma.$transaction(async (tx) => {
    // Starszy, jeszcze nieprzejrzany odczyt tego samego komputera traci aktualność —
    // np. admin uruchomił skrypt drugi raz albo po onboardingu. Status ODRZUCONY bez
    // osoby rozpatrującej = „zastąpiony nowszym odczytem”.
    const tenSam: Prisma.OdczytSprzetuWhereInput | null = dopasowanie
      ? { computerId: dopasowanie.computerId }
      : propozycja.numerSeryjny
        ? { computerId: null, numerSeryjny: propozycja.numerSeryjny }
        : dane.hostname
          ? { computerId: null, hostname: dane.hostname }
          : null;
    if (tenSam) {
      await tx.odczytSprzetu.updateMany({
        where: { ...tenSam, status: 'NOWY' },
        data: { status: 'ODRZUCONY', rozpatrzonoAt: new Date() },
      });
    }
    return tx.odczytSprzetu.create({
      data: {
        kodId,
        zrodlo,
        computerId: dopasowanie?.computerId ?? null,
        dopasowanie: dopasowanie?.dopasowanie ?? null,
        hostname: dane.hostname,
        numerSeryjny: propozycja.numerSeryjny ?? null,
        dane: JSON.stringify(dane),
      },
      include: { computer: { select: { numerEwidencyjny: true } } },
    });
  });

  const komunikat = odczyt.computer
    ? `Dane wysłane. Komputer rozpoznany w ewidencji jako ${odczyt.computer.numerEwidencyjny} — zmiany czekają na zatwierdzenie w aplikacji.`
    : 'Dane wysłane. Tego komputera nie ma jeszcze w ewidencji — dodasz go w aplikacji (Odczyt sprzętu).';
  return { odczyt, komunikat };
}

/** Odczytuje zapisany JSON; zapis przeszedł walidację, ale schemat mógł się od tego czasu zmienić. */
export function daneZapisane(json: string): DaneOdczytu {
  return daneOdczytuSchema.parse(JSON.parse(json));
}

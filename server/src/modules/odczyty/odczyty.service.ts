import type { Prisma } from '@prisma/client';
import {
  daneOdczytuSchema,
  POLA_ODCZYTU,
  type DaneOdczytu,
  type DopasowanieOdczytu,
  type PoleOdczytu,
  type ZrodloOdczytu,
} from 'shared';
import { prisma } from '../../db/prisma';
import { TOKEN_REGEX, wygenerujToken } from '../../utils/kodDostepu';
import { mapujOdczyt, normalizujMac, type PropozycjaOdczytu } from './mapowanie';

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

/** Porównanie odporne na wielkość liter i spacje (MAC, numery seryjne, nazwy). */
function takieSame(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim().toUpperCase());
  return norm(a) === norm(b);
}

/** Pola, w których ewidencja różni się od odczytu — po zatwierdzeniu to świadoma decyzja admina
 *  (pole odznaczone albo wpisane inaczej), zapisywana w `pominietePola` odczytu. */
export function polaRozne(propozycja: PropozycjaOdczytu, komputer: Partial<Record<PoleOdczytu, unknown>>): PoleOdczytu[] {
  return POLA_ODCZYTU.filter((pole) => propozycja[pole] !== undefined && !takieSame(propozycja[pole], komputer[pole]));
}

/** Zapisane `pominietePola`; brak (odczyty sprzed tej funkcji) = nic nie pominięto. */
export function listaPominietych(json: string | null): PoleOdczytu[] {
  if (!json) return [];
  try {
    const lista: unknown = JSON.parse(json);
    return Array.isArray(lista) ? POLA_ODCZYTU.filter((pole) => lista.includes(pole)) : [];
  } catch {
    return [];
  }
}

/**
 * Pola, w których odczyt wnosi coś NOWEGO względem ewidencji. Różnica, którą admin świadomie
 * zostawił przy ostatnim zatwierdzeniu (np. woli nazwę „HP EliteBook 840 G10” zamiast
 * „… Notebook PC”), nie wraca w każdym cyklicznym odczycie — dopóki komputer zgłasza w tym polu
 * to samo co wtedy. Każda inna różnica (zmiana sprzętu, ręczna zmiana ewidencji w polu, które się
 * zgadzało) trafia do przejrzenia.
 */
export async function noweRoznice(propozycja: PropozycjaOdczytu, computerId: number): Promise<PoleOdczytu[]> {
  const komputer = await prisma.computer.findUnique({ where: { id: computerId } });
  if (!komputer) return [];
  const zatwierdzony = await prisma.odczytSprzetu.findFirst({
    where: { computerId, status: { in: ['ZASTOSOWANY', 'BEZ_ZMIAN'] } },
    orderBy: { otrzymanoAt: 'desc' },
  });
  const pominiete = new Set(listaPominietych(zatwierdzony?.pominietePola ?? null));
  let poprzednia: PropozycjaOdczytu = {};
  if (zatwierdzony && pominiete.size > 0) {
    try {
      poprzednia = mapujOdczyt(daneZapisane(zatwierdzony.dane)).propozycja;
    } catch {
      // uszkodzony stary odczyt — nic nie wyciszamy
    }
  }
  return polaRozne(propozycja, komputer).filter(
    (pole) => !(pominiete.has(pole) && poprzednia[pole] !== undefined && takieSame(propozycja[pole], poprzednia[pole])),
  );
}

interface ZapiszOdczytParams {
  dane: DaneOdczytu;
  zrodlo: ZrodloOdczytu;
  kodId?: number | null;
  agentId?: number | null;
  /** Komputer znany z góry (kod przypięty do komputera, sesja onboardingu, token odczytu cyklicznego). */
  wskazany?: Dopasowanie | null;
}

/** Zapisuje odczyt, dopasowuje komputer i zwraca komunikat do wyświetlenia w skrypcie. */
export async function zapiszOdczyt({ dane, zrodlo, kodId = null, agentId = null, wskazany = null }: ZapiszOdczytParams) {
  const dopasowanie = wskazany ?? (await dopasujKomputer(dane));
  const { propozycja } = mapujOdczyt(dane);
  // Nic nowego = odczyt od razu „bez zmian”: odnotowuje, że komputer żyje (i np. stan BitLockera),
  // ale nie trafia na listę do przejrzenia — inaczej odczyt cykliczny zasypałby ją co tydzień.
  const bezZmian = dopasowanie ? (await noweRoznice(propozycja, dopasowanie.computerId)).length === 0 : false;
  // Odczyt „bez zmian” przenosi dalej wyciszone różnice — inaczej wróciłyby przy następnym odczycie.
  const komputer = bezZmian && dopasowanie ? await prisma.computer.findUnique({ where: { id: dopasowanie.computerId } }) : null;
  const pominietePola = komputer ? JSON.stringify(polaRozne(propozycja, komputer)) : null;

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
        agentId,
        zrodlo,
        ...(bezZmian ? { status: 'BEZ_ZMIAN', rozpatrzonoAt: new Date(), pominietePola } : {}),
        computerId: dopasowanie?.computerId ?? null,
        dopasowanie: dopasowanie?.dopasowanie ?? null,
        hostname: dane.hostname,
        numerSeryjny: propozycja.numerSeryjny ?? null,
        dane: JSON.stringify(dane),
      },
      include: { computer: { select: { numerEwidencyjny: true } } },
    });
  });

  const komunikat = !odczyt.computer
    ? 'Dane wysłane. Tego komputera nie ma jeszcze w ewidencji — dodasz go w aplikacji (Odczyt sprzętu).'
    : bezZmian
      ? `Dane wysłane. ${odczyt.computer.numerEwidencyjny}: brak nowych różnic względem ewidencji.`
      : `Dane wysłane. Komputer rozpoznany w ewidencji jako ${odczyt.computer.numerEwidencyjny} — zmiany czekają na zatwierdzenie w aplikacji.`;
  return { odczyt, komunikat };
}

/** Odczytuje zapisany JSON; zapis przeszedł walidację, ale schemat mógł się od tego czasu zmienić. */
export function daneZapisane(json: string): DaneOdczytu {
  return daneOdczytuSchema.parse(JSON.parse(json));
}

/**
 * Nowy stały token odczytu cyklicznego. Komputer ma najwyżej jeden aktywny token — przy
 * ponownej instalacji poprzedni jest wyłączany (stare zadanie przestałoby być potrzebne).
 */
export async function utworzAgenta(computerId: number | null) {
  let token = wygenerujToken();
  while (await prisma.odczytAgent.findUnique({ where: { token } })) token = wygenerujToken();
  return prisma.$transaction(async (tx) => {
    if (computerId) {
      await tx.odczytAgent.updateMany({ where: { computerId, aktywny: true }, data: { aktywny: false } });
    }
    return tx.odczytAgent.create({ data: { token, computerId } });
  });
}

export async function znajdzAktywnegoAgenta(tokenSurowy: string) {
  const token = tokenSurowy.toLowerCase();
  if (!TOKEN_REGEX.test(token)) return null;
  const agent = await prisma.odczytAgent.findUnique({ where: { token } });
  return agent?.aktywny ? agent : null;
}

/** Odczyt z zadania cyklicznego; token bez komputera (instalacja kodem ogólnym) przypina
 *  się do komputera przy pierwszym odczycie, który uda się dopasować. */
export async function zapiszOdczytAgenta(agent: { id: number; computerId: number | null }, dane: DaneOdczytu) {
  const wynik = await zapiszOdczyt({
    dane,
    zrodlo: 'AGENT',
    agentId: agent.id,
    wskazany: agent.computerId ? { computerId: agent.computerId, dopasowanie: 'AGENT' } : null,
  });
  const computerId = agent.computerId ?? wynik.odczyt.computerId;
  await prisma.$transaction(async (tx) => {
    if (!agent.computerId && computerId) {
      await tx.odczytAgent.updateMany({ where: { computerId, aktywny: true, id: { not: agent.id } }, data: { aktywny: false } });
    }
    await tx.odczytAgent.update({
      where: { id: agent.id },
      data: { computerId: computerId ?? null, ostatnioAt: new Date(), hostname: dane.hostname },
    });
  });
  return wynik;
}

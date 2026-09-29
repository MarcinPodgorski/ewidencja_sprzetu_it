import { edycjaWindowsa, rodzinaSystemu, SEKCJE_STANU_FLOTY, type SekcjaStanuFloty, type SystemOperacyjny } from 'shared';
import { prisma } from '../../db/prisma';
import { daneZapisane } from '../odczyty/odczyty.service';

/** Progi „stanu floty” — co uznajemy za wymagające uwagi. */
export const PROGI = {
  /** Odczyt starszy niż tyle dni = dane komputera mogą być nieaktualne. */
  dniOdczytu: 30,
  /** Gwarancja kończąca się w ciągu tylu dni. */
  dniGwarancji: 90,
  /** Komputer starszy niż tyle lat (od daty zakupu) = do planu wymiany. */
  latWymiany: 5,
} as const;

const DZIEN_MS = 24 * 60 * 60 * 1000;

export interface KomputerWStanie {
  id: number;
  numerEwidencyjny: string;
  markaModel: string;
  systemOperacyjny: SystemOperacyjny | null;
  wersjaSystemu: string | null;
  uzytkownik: string | null;
  dzial: string | null;
}

export interface PozycjaGwarancji {
  sprzetTyp: 'KOMPUTER' | 'TELEFON' | 'DRUKARKA';
  id: number;
  identyfikator: string;
  markaModel: string;
  dataKoncaGwarancji: string;
  dniDoKonca: number;
}

/** Sekcje ukryte przez dział IT (brak ustawień = żadna). */
export async function ukryteSekcjeStanuFloty(): Promise<SekcjaStanuFloty[]> {
  const ustawienia = await prisma.ustawieniaStanuFloty.findUnique({ where: { id: 1 } });
  if (!ustawienia) return [];
  try {
    const lista: unknown = JSON.parse(ustawienia.ukryteSekcje);
    return Array.isArray(lista) ? SEKCJE_STANU_FLOTY.filter((s) => lista.includes(s)) : [];
  } catch {
    return [];
  }
}

export async function zapiszUkryteSekcje(sekcje: SekcjaStanuFloty[]): Promise<SekcjaStanuFloty[]> {
  const ukryte = SEKCJE_STANU_FLOTY.filter((s) => sekcje.includes(s));
  const json = JSON.stringify(ukryte);
  await prisma.ustawieniaStanuFloty.upsert({ where: { id: 1 }, update: { ukryteSekcje: json }, create: { id: 1, ukryteSekcje: json } });
  return ukryte;
}

/**
 * Przegląd floty: na podstawie ewidencji i najnowszego odczytu każdego komputera
 * (odczyty odrzucone są pomijane — mogły pochodzić z innej maszyny albo być próbą).
 */
export async function obliczStanFloty() {
  const teraz = Date.now();
  const komputery = await prisma.computer.findMany({
    where: { wycofany: false },
    include: {
      aktualnyUzytkownik: { include: { dzial: true } },
      odczytAgenci: { where: { aktywny: true }, select: { id: true, ostatnioAt: true, createdAt: true } },
    },
    orderBy: { numerEwidencyjny: 'asc' },
  });

  const odczyty = await prisma.odczytSprzetu.findMany({
    where: { computerId: { not: null }, status: { not: 'ODRZUCONY' } },
    select: { id: true, computerId: true, otrzymanoAt: true, dane: true },
    orderBy: { otrzymanoAt: 'desc' },
  });
  const ostatniOdczyt = new Map<number, (typeof odczyty)[number]>();
  for (const o of odczyty) if (o.computerId && !ostatniOdczyt.has(o.computerId)) ostatniOdczyt.set(o.computerId, o);

  const daneOdczytu = (computerId: number) => {
    const o = ostatniOdczyt.get(computerId);
    if (!o) return null;
    try {
      return { odczytId: o.id, odczytAt: o.otrzymanoAt.toISOString(), dane: daneZapisane(o.dane) };
    } catch {
      return null;
    }
  };

  const opis = (k: (typeof komputery)[number]): KomputerWStanie => ({
    id: k.id,
    numerEwidencyjny: k.numerEwidencyjny,
    markaModel: k.markaModel,
    systemOperacyjny: k.systemOperacyjny as SystemOperacyjny | null,
    wersjaSystemu: k.wersjaSystemu,
    uzytkownik: k.aktualnyUzytkownik ? `${k.aktualnyUzytkownik.imie} ${k.aktualnyUzytkownik.nazwisko}` : null,
    dzial: k.aktualnyUzytkownik?.dzial.nazwa ?? null,
  });

  // Windows 10 — koniec wsparcia (bez płatnego ESU brak poprawek bezpieczeństwa).
  const windows10 = komputery
    .filter((k) => k.systemOperacyjny === 'WINDOWS_10_PRO' || k.systemOperacyjny === 'WINDOWS_10_HOME')
    .map(opis);

  // Szyfrowanie dysku: zgubiony laptop bez BitLockera = dane firmy w obcych rękach.
  const bitlocker = komputery.flatMap((k) => {
    const o = daneOdczytu(k.id);
    const stan = o?.dane.bitlocker;
    return o && (stan === 'WYLACZONY' || stan === 'WSTRZYMANY')
      ? [{ ...opis(k), stan, odczytId: o.odczytId, odczytAt: o.odczytAt }]
      : [];
  });

  // Windows Pro powinien być dołączony do Entra ID (logowanie kontem M365). Home tego nie umie.
  const entraId = komputery.flatMap((k) => {
    if (edycjaWindowsa(k.systemOperacyjny as SystemOperacyjny | null) !== 'PRO') return [];
    const o = daneOdczytu(k.id);
    const stan = o?.dane.entraId;
    return o && (stan === 'BRAK' || stan === 'KONTO_SLUZBOWE')
      ? [{ ...opis(k), stan, odczytId: o.odczytId, odczytAt: o.odczytAt }]
      : [];
  });

  // Gwarancje kończące się wkrótce — komputery, telefony, drukarki.
  const granicaGwarancji = new Date(teraz + PROGI.dniGwarancji * DZIEN_MS);
  const dzisiaj = new Date(teraz);
  const [telefony, drukarki] = await Promise.all([
    prisma.phone.findMany({ where: { wycofany: false, dataKoncaGwarancji: { gte: dzisiaj, lte: granicaGwarancji } } }),
    prisma.printer.findMany({ where: { wycofany: false, dataKoncaGwarancji: { gte: dzisiaj, lte: granicaGwarancji } } }),
  ]);
  const gwarancja = (
    sprzetTyp: PozycjaGwarancji['sprzetTyp'],
    s: { id: number; numerEwidencyjny: string; markaModel: string; dataKoncaGwarancji: Date | null },
  ): PozycjaGwarancji => ({
    sprzetTyp,
    id: s.id,
    identyfikator: s.numerEwidencyjny,
    markaModel: s.markaModel,
    dataKoncaGwarancji: s.dataKoncaGwarancji!.toISOString(),
    dniDoKonca: Math.ceil((s.dataKoncaGwarancji!.getTime() - teraz) / DZIEN_MS),
  });
  const gwarancje = [
    ...komputery
      .filter((k) => k.dataKoncaGwarancji && k.dataKoncaGwarancji >= dzisiaj && k.dataKoncaGwarancji <= granicaGwarancji)
      .map((k) => gwarancja('KOMPUTER', k)),
    ...telefony.map((t) => gwarancja('TELEFON', t)),
    ...drukarki.map((d) => gwarancja('DRUKARKA', d)),
  ].sort((a, b) => a.dniDoKonca - b.dniDoKonca);

  // Plan wymiany — wiek liczony od daty zakupu.
  const doWymiany = komputery
    .filter((k) => k.dataZakupu && teraz - k.dataZakupu.getTime() > PROGI.latWymiany * 365.25 * DZIEN_MS)
    .map((k) => ({
      ...opis(k),
      dataZakupu: k.dataZakupu!.toISOString(),
      wiekLat: Math.floor((teraz - k.dataZakupu!.getTime()) / (365.25 * DZIEN_MS)),
    }));
  const bezDatyZakupu = komputery.filter((k) => !k.dataZakupu).length;

  // Dane mogą być nieaktualne: Windows (albo nieznany system) bez świeżego odczytu.
  const bezOdczytu = komputery.flatMap((k) => {
    const system = k.systemOperacyjny as SystemOperacyjny | null;
    if (system && rodzinaSystemu(system) !== 'WINDOWS') return [];
    const o = ostatniOdczyt.get(k.id);
    if (o && teraz - o.otrzymanoAt.getTime() <= PROGI.dniOdczytu * DZIEN_MS) return [];
    const agent = k.odczytAgenci[0] ?? null;
    return [
      {
        ...opis(k),
        ostatniOdczyt: o?.otrzymanoAt.toISOString() ?? null,
        odczytCykliczny: agent ? { ostatnioAt: agent.ostatnioAt?.toISOString() ?? null } : null,
      },
    ];
  });

  return {
    progi: PROGI,
    // Ukryte sekcje i tak są liczone (to kilka zapytań) — strona pokazuje je na liście do przywrócenia.
    ukryteSekcje: await ukryteSekcjeStanuFloty(),
    podsumowanie: {
      komputery: komputery.length,
      zAktualnymOdczytem: komputery.filter((k) => {
        const o = ostatniOdczyt.get(k.id);
        return o && teraz - o.otrzymanoAt.getTime() <= PROGI.dniOdczytu * DZIEN_MS;
      }).length,
      zOdczytemCyklicznym: komputery.filter((k) => k.odczytAgenci.length > 0).length,
    },
    windows10,
    bitlocker,
    entraId,
    gwarancje,
    doWymiany,
    bezDatyZakupu,
    bezOdczytu,
  };
}

export type StanFloty = Awaited<ReturnType<typeof obliczStanFloty>>;

/** Liczby do pulpitu (bez sekcji „bez odczytu” — to informacja, nie problem do rozwiązania).
 *  Ukryta sekcja liczy się jako 0 — pulpit pomija zera. */
export function licznikiStanuFloty(stan: StanFloty) {
  const ile = (sekcja: SekcjaStanuFloty, lista: unknown[]) => (stan.ukryteSekcje.includes(sekcja) ? 0 : lista.length);
  return {
    windows10: ile('windows10', stan.windows10),
    bitlocker: ile('bitlocker', stan.bitlocker),
    entraId: ile('entraId', stan.entraId),
    gwarancje: ile('gwarancje', stan.gwarancje),
    doWymiany: ile('doWymiany', stan.doWymiany),
  };
}

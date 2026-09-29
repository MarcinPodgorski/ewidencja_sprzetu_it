import { TYPY_WYNIKU_SZUKANIA, type TypWynikuSzukania } from 'shared';
import { prisma } from '../../db/prisma';
import { doPorownania, kompaktowy } from '../../utils/tekst';

interface Pole {
  etykieta: string;
  wartosc: string | null | undefined;
  /** Numer, MAC, IMEI… — porównywany także bez separatorów. */
  identyfikator?: boolean;
  /** Pokazane w tytule albo podtytule wyniku — nie trzeba go dopisywać jako „dopasowanie”. */
  widoczne?: boolean;
  /** Pole poboczne (notatki, opis) — trafienie w nim waży mniej. */
  poboczne?: boolean;
}

interface Kandydat {
  typ: TypWynikuSzukania;
  id: number;
  tytul: string;
  podtytul: string | null;
  nieaktywny: boolean;
  /** Tylko „Różne”: pozycja nie ma własnej strony, wynik prowadzi do karty pracownika. */
  pracownikId?: number;
  pola: Pole[];
}

export interface WynikSzukania {
  typ: TypWynikuSzukania;
  id: number;
  tytul: string;
  podtytul: string | null;
  nieaktywny: boolean;
  pracownikId?: number;
  /** Pole, w którym znaleziono frazę, gdy nie widać go w tytule/podtytule (np. „MAC (WiFi): …”). */
  dopasowanie: string | null;
}

const NA_TYP = 5;
const MAX_DOPASOWANIE = 60;

function osoba(e: { imie: string; nazwisko: string } | null | undefined): string {
  return e ? `${e.imie} ${e.nazwisko}` : 'nieprzypisany';
}

function kwota(grosze: number): string {
  return `${(grosze / 100).toFixed(2).replace('.', ',')} zł`;
}

async function kandydaci(): Promise<Kandydat[]> {
  const uzytkownik = { select: { imie: true, nazwisko: true } } as const;
  const [komputery, monitory, myszy, klawiatury, telefony, karty, drukarki, tonery, pracownicy, rozne, faktury, spisy] =
    await Promise.all([
      prisma.computer.findMany({ include: { aktualnyUzytkownik: uzytkownik } }),
      prisma.monitor.findMany({ include: { aktualnyUzytkownik: uzytkownik } }),
      prisma.mouse.findMany({ include: { aktualnyUzytkownik: uzytkownik } }),
      prisma.keyboard.findMany({ include: { aktualnyUzytkownik: uzytkownik } }),
      prisma.phone.findMany({ include: { aktualnyUzytkownik: uzytkownik, simCard: { select: { numerTelefonu: true } } } }),
      prisma.simCard.findMany({ include: { aktualnyUzytkownik: uzytkownik } }),
      prisma.printer.findMany(),
      prisma.toner.findMany(),
      prisma.employee.findMany({ include: { dzial: { select: { nazwa: true } } } }),
      prisma.miscItem.findMany({ include: { employee: { select: { id: true, imie: true, nazwisko: true, aktywny: true } } } }),
      prisma.faktura.findMany({ select: { id: true, numer: true, numerKsef: true, kwotaGrosze: true } }),
      prisma.equipmentList.findMany({ include: { dzial: { select: { nazwa: true } } } }),
    ]);

  const wynik: Kandydat[] = [];
  for (const k of komputery) {
    wynik.push({
      typ: 'KOMPUTER',
      id: k.id,
      tytul: k.numerEwidencyjny,
      podtytul: `${k.markaModel} · ${osoba(k.aktualnyUzytkownik)}`,
      nieaktywny: k.wycofany,
      pola: [
        { etykieta: 'Numer ewidencyjny', wartosc: k.numerEwidencyjny, identyfikator: true, widoczne: true },
        { etykieta: 'Marka/model', wartosc: k.markaModel, widoczne: true },
        { etykieta: 'Numer seryjny', wartosc: k.numerSeryjny, identyfikator: true },
        { etykieta: 'MAC (Ethernet)', wartosc: k.macEthernet, identyfikator: true },
        { etykieta: 'MAC (WiFi)', wartosc: k.macWifi, identyfikator: true },
        { etykieta: 'CPU', wartosc: k.cpu },
        { etykieta: 'Notatki', wartosc: k.notatki, poboczne: true },
      ],
    });
  }
  const peryferia = [
    ['MONITOR', monitory],
    ['MYSZ', myszy],
    ['KLAWIATURA', klawiatury],
  ] as const;
  for (const [typ, lista] of peryferia) {
    for (const p of lista) {
      wynik.push({
        typ,
        id: p.id,
        tytul: p.numerEwidencyjny,
        podtytul: `${p.markaModel} · ${osoba(p.aktualnyUzytkownik)}`,
        nieaktywny: p.wycofany,
        pola: [
          { etykieta: 'Numer ewidencyjny', wartosc: p.numerEwidencyjny, identyfikator: true, widoczne: true },
          { etykieta: 'Marka/model', wartosc: p.markaModel, widoczne: true },
          { etykieta: 'Numer seryjny', wartosc: p.numerSeryjny, identyfikator: true },
        ],
      });
    }
  }
  for (const t of telefony) {
    wynik.push({
      typ: 'TELEFON',
      id: t.id,
      tytul: t.numerEwidencyjny,
      podtytul: `${t.markaModel} · ${osoba(t.aktualnyUzytkownik)}`,
      nieaktywny: t.wycofany,
      pola: [
        { etykieta: 'Numer ewidencyjny', wartosc: t.numerEwidencyjny, identyfikator: true, widoczne: true },
        { etykieta: 'Marka/model', wartosc: t.markaModel, widoczne: true },
        { etykieta: 'Numer seryjny', wartosc: t.numerSeryjny, identyfikator: true },
        { etykieta: 'IMEI', wartosc: t.imei, identyfikator: true },
        { etykieta: 'Numer telefonu', wartosc: t.simCard?.numerTelefonu, identyfikator: true },
      ],
    });
  }
  for (const s of karty) {
    wynik.push({
      typ: 'KARTA_SIM',
      id: s.id,
      tytul: s.numerTelefonu,
      podtytul: `${s.taryfa} · ${osoba(s.aktualnyUzytkownik)}`,
      nieaktywny: s.wycofany,
      pola: [
        { etykieta: 'Numer telefonu', wartosc: s.numerTelefonu, identyfikator: true, widoczne: true },
        { etykieta: 'ICCID', wartosc: s.iccid, identyfikator: true },
        { etykieta: 'Taryfa', wartosc: s.taryfa, widoczne: true },
      ],
    });
  }
  for (const d of drukarki) {
    wynik.push({
      typ: 'DRUKARKA',
      id: d.id,
      tytul: d.numerEwidencyjny,
      podtytul: `${d.markaModel} · ${d.dzialPietroMiejsce}`,
      nieaktywny: d.wycofany,
      pola: [
        { etykieta: 'Numer ewidencyjny', wartosc: d.numerEwidencyjny, identyfikator: true, widoczne: true },
        { etykieta: 'Marka/model', wartosc: d.markaModel, widoczne: true },
        { etykieta: 'Miejsce', wartosc: d.dzialPietroMiejsce, widoczne: true },
        { etykieta: 'Numer seryjny', wartosc: d.numerSeryjny, identyfikator: true },
        { etykieta: 'Adres IP', wartosc: d.adresIP },
        { etykieta: 'MAC', wartosc: d.mac, identyfikator: true },
      ],
    });
  }
  for (const t of tonery) {
    wynik.push({
      typ: 'TONER',
      id: t.id,
      tytul: t.oznaczenie,
      podtytul: `na stanie: ${t.ilosc} szt.`,
      nieaktywny: false,
      pola: [{ etykieta: 'Oznaczenie', wartosc: t.oznaczenie, identyfikator: true, widoczne: true }],
    });
  }
  for (const e of pracownicy) {
    wynik.push({
      typ: 'PRACOWNIK',
      id: e.id,
      tytul: `${e.imie} ${e.nazwisko}`,
      podtytul: `${e.stanowisko} · ${e.dzial.nazwa}`,
      nieaktywny: !e.aktywny,
      pola: [
        { etykieta: 'Imię i nazwisko', wartosc: `${e.imie} ${e.nazwisko}`, widoczne: true },
        { etykieta: 'Nazwisko i imię', wartosc: `${e.nazwisko} ${e.imie}`, widoczne: true },
        { etykieta: 'Stanowisko', wartosc: e.stanowisko, widoczne: true },
        { etykieta: 'Dział', wartosc: e.dzial.nazwa, widoczne: true },
        { etykieta: 'E-mail', wartosc: e.email },
      ],
    });
  }
  for (const r of rozne) {
    wynik.push({
      typ: 'ROZNE',
      id: r.id,
      tytul: r.opis,
      podtytul: osoba(r.employee),
      nieaktywny: !r.employee.aktywny,
      pracownikId: r.employee.id,
      pola: [{ etykieta: 'Opis', wartosc: r.opis, widoczne: true }],
    });
  }
  for (const f of faktury) {
    wynik.push({
      typ: 'FAKTURA',
      id: f.id,
      tytul: f.numer,
      podtytul: kwota(f.kwotaGrosze),
      nieaktywny: false,
      pola: [
        { etykieta: 'Numer', wartosc: f.numer, identyfikator: true, widoczne: true },
        { etykieta: 'Numer KSeF', wartosc: f.numerKsef, identyfikator: true },
      ],
    });
  }
  for (const s of spisy) {
    wynik.push({
      typ: 'SPIS',
      id: s.id,
      tytul: s.nazwa,
      podtytul: s.dzial.nazwa,
      nieaktywny: false,
      pola: [
        { etykieta: 'Nazwa', wartosc: s.nazwa, widoczne: true },
        { etykieta: 'Dział', wartosc: s.dzial.nazwa, widoczne: true },
        { etykieta: 'Opis', wartosc: s.opis, poboczne: true },
      ],
    });
  }
  return wynik;
}

interface Zapytanie {
  fraza: string;
  slowa: string[];
  kompakt: string;
}

/** 0 = nie pasuje. Całe pole > początek pola > początek słowa > środek; identyfikatory także bez separatorów. */
function ocen(kandydat: Kandydat, { fraza, slowa, kompakt }: Zapytanie): { punkty: number; pole: Pole | null } {
  let punkty = 0;
  let najlepsze: Pole | null = null;
  for (const pole of kandydat.pola) {
    if (!pole.wartosc) continue;
    const tekst = doPorownania(pole.wartosc);
    let p = 0;
    if (tekst === fraza) p = 100;
    else if (tekst.startsWith(fraza)) p = 70;
    else if (tekst.includes(` ${fraza}`)) p = 60;
    else if (tekst.includes(fraza)) p = 40;
    else if (slowa.length > 1 && slowa.every((s) => tekst.includes(s))) p = 35;
    if (pole.identyfikator && kompakt.length >= 2) {
      const k = kompaktowy(pole.wartosc);
      if (k === kompakt) p = Math.max(p, 100);
      else if (k.startsWith(kompakt)) p = Math.max(p, 70);
      else if (kompakt.length >= 3 && k.includes(kompakt)) p = Math.max(p, 40);
    }
    if (pole.poboczne) p = Math.floor(p / 2);
    if (p > punkty) {
      punkty = p;
      najlepsze = pole;
    }
  }
  // Słowa w różnych polach („dell 5440”, „nowak księgowość”) — każde musi gdzieś pasować.
  if (punkty === 0 && slowa.length > 1) {
    const razem = kandydat.pola
      .filter((pole) => pole.wartosc && !pole.poboczne)
      .map((pole) => doPorownania(pole.wartosc!))
      .join(' ');
    if (slowa.every((s) => razem.includes(s))) punkty = 30;
  }
  // Wycofany sprzęt i byli pracownicy — nadal do znalezienia, ale za aktywnymi.
  if (punkty > 0 && kandydat.nieaktywny) punkty = Math.max(1, punkty - 15);
  return { punkty, pole: najlepsze };
}

function opisDopasowania(pole: Pole | null): string | null {
  if (!pole || pole.widoczne || !pole.wartosc) return null;
  const wartosc = pole.wartosc.replace(/\s+/g, ' ').trim();
  const skrocona = wartosc.length > MAX_DOPASOWANIE ? `${wartosc.slice(0, MAX_DOPASOWANIE - 1)}…` : wartosc;
  return `${pole.etykieta}: ${skrocona}`;
}

/**
 * Wyszukiwarka całej ewidencji. Danych jest najwyżej kilka tysięcy wierszy, więc porównanie
 * w pamięci jest proste i szybkie — a SQLite nie umie porównywać bez wielkości liter ani
 * bez polskich znaków (LIKE działa tak tylko dla ASCII).
 */
export async function szukaj(q: string): Promise<{ wyniki: WynikSzukania[]; lacznie: Partial<Record<TypWynikuSzukania, number>> }> {
  const fraza = doPorownania(q);
  const zapytanie: Zapytanie = { fraza, slowa: fraza.split(' ').filter(Boolean), kompakt: kompaktowy(q) };
  if (fraza.length < 2) return { wyniki: [], lacznie: {} };

  const kolejnosc = (typ: TypWynikuSzukania) => TYPY_WYNIKU_SZUKANIA.indexOf(typ);
  const trafienia = (await kandydaci())
    .map((kandydat) => ({ kandydat, ...ocen(kandydat, zapytanie) }))
    .filter((t) => t.punkty > 0)
    .sort(
      (a, b) =>
        b.punkty - a.punkty ||
        kolejnosc(a.kandydat.typ) - kolejnosc(b.kandydat.typ) ||
        a.kandydat.tytul.localeCompare(b.kandydat.tytul, 'pl'),
    );

  const lacznie: Partial<Record<TypWynikuSzukania, number>> = {};
  const wyniki: WynikSzukania[] = [];
  for (const { kandydat, pole } of trafienia) {
    const ile = (lacznie[kandydat.typ] ?? 0) + 1;
    lacznie[kandydat.typ] = ile;
    if (ile > NA_TYP) continue;
    wyniki.push({
      typ: kandydat.typ,
      id: kandydat.id,
      tytul: kandydat.tytul,
      podtytul: kandydat.podtytul,
      nieaktywny: kandydat.nieaktywny,
      pracownikId: kandydat.pracownikId,
      dopasowanie: opisDopasowania(pole),
    });
  }
  return { wyniki, lacznie };
}

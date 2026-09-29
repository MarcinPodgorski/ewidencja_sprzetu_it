import type { Prisma } from '@prisma/client';
import {
  computerCreateSchema,
  employeeCreateSchema,
  keyboardCreateSchema,
  monitorCreateSchema,
  mouseCreateSchema,
  phoneCreateSchema,
  POLA_IMPORTU,
  printerCreateSchema,
  simCardCreateSchema,
  type EquipmentType,
  type ImportInput,
  type TypImportu,
  type UwagaImportu,
  type WartoscImportu,
  type WierszImportu,
  type WynikImportu,
} from 'shared';
import type { ZodTypeAny } from 'zod';
import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';
import { doPorownania, kompaktowy } from '../../utils/tekst';
import { pracownikDoHistorii, zapiszZmiane } from '../historiaZmian/historiaZmian.service';
import { utworzKopie } from '../kopie/kopie.service';
import * as k from './konwersje';

const KONTEKST_HISTORII = 'import z Excela';

/** Schematy tworzenia — te same co w formularzach; dział pracownika rozwiązywany osobno (po nazwie). */
const SCHEMATY: Record<TypImportu, ZodTypeAny> = {
  PRACOWNIK: employeeCreateSchema.omit({ dzialId: true }),
  KOMPUTER: computerCreateSchema,
  MONITOR: monitorCreateSchema,
  MYSZ: mouseCreateSchema,
  KLAWIATURA: keyboardCreateSchema,
  TELEFON: phoneCreateSchema,
  KARTA_SIM: simCardCreateSchema,
  DRUKARKA: printerCreateSchema,
};

/** Pola przepisywane bez interpretacji — Excel mógł je zepsuć notacją naukową. */
const IDENTYFIKATORY = new Set(['numerEwidencyjny', 'numerSeryjny', 'imei', 'iccid', 'numerTelefonu']);

interface Pracownik {
  id: number;
  imie: string;
  nazwisko: string;
  email: string | null;
  aktywny: boolean;
  dzial: { nazwa: string };
}

interface Kontekst {
  typ: TypImportu;
  /** Imię i nazwisko (słowa w dowolnej kolejności, bez polskich znaków) → pracownicy. */
  pracownicyPoNazwie: Map<string, Pracownik[]>;
  pracownicyPoEmailu: Map<string, Pracownik>;
  /** Numery ewidencyjne sprzętu importowanego typu (małymi literami). */
  numery: Set<string>;
  /** Numer seryjny (bez separatorów) → numer ewidencyjny. */
  seryjne: Map<string, string>;
  imei: Map<string, string>;
  karty: { id: number; iccid: string; numerTelefonu: string; telefon: string | null }[];
  dzialy: Map<string, { id: number; nazwa: string }>;
}

/** Co już padło w tym samym arkuszu — duplikaty wewnątrz importu. */
interface Partia {
  numery: Map<string, number>;
  seryjne: Map<string, number>;
  imei: Map<string, number>;
  iccid: Map<string, number>;
  telefony: Map<string, number>;
  karty: Map<number, number>;
  osoby: Map<string, number>;
  emaile: Map<string, number>;
}

async function sprzetTypu(typ: TypImportu): Promise<{ numerEwidencyjny: string; numerSeryjny: string; imei?: string }[]> {
  const select = { numerEwidencyjny: true, numerSeryjny: true } as const;
  switch (typ) {
    case 'KOMPUTER':
      return prisma.computer.findMany({ select });
    case 'MONITOR':
      return prisma.monitor.findMany({ select });
    case 'MYSZ':
      return prisma.mouse.findMany({ select });
    case 'KLAWIATURA':
      return prisma.keyboard.findMany({ select });
    case 'TELEFON':
      return prisma.phone.findMany({ select: { ...select, imei: true } });
    case 'DRUKARKA':
      return prisma.printer.findMany({ select });
    default:
      return [];
  }
}

/** Klucz osoby niezależny od kolejności słów: „Jan Nowak”, „Nowak Jan” i „NOWAK jan” to ta sama osoba. */
function kluczOsoby(tekst: string): string {
  return doPorownania(tekst).split(' ').sort().join(' ');
}

async function wczytajKontekst(typ: TypImportu): Promise<Kontekst> {
  const pracownicy = await prisma.employee.findMany({
    select: { id: true, imie: true, nazwisko: true, email: true, aktywny: true, dzial: { select: { nazwa: true } } },
  });
  const pracownicyPoNazwie = new Map<string, Pracownik[]>();
  for (const p of pracownicy) {
    const klucz = kluczOsoby(`${p.imie} ${p.nazwisko}`);
    pracownicyPoNazwie.set(klucz, [...(pracownicyPoNazwie.get(klucz) ?? []), p]);
  }
  const sprzet = await sprzetTypu(typ);
  const karty =
    typ === 'TELEFON' || typ === 'KARTA_SIM'
      ? await prisma.simCard.findMany({
          select: { id: true, iccid: true, numerTelefonu: true, phone: { select: { numerEwidencyjny: true } } },
        })
      : [];
  const dzialy = typ === 'PRACOWNIK' ? await prisma.department.findMany({ select: { id: true, nazwa: true } }) : [];
  return {
    typ,
    pracownicyPoNazwie,
    pracownicyPoEmailu: new Map(pracownicy.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p])),
    numery: new Set(sprzet.map((s) => s.numerEwidencyjny.toLowerCase())),
    seryjne: new Map(sprzet.map((s) => [kompaktowy(s.numerSeryjny), s.numerEwidencyjny])),
    imei: new Map(sprzet.filter((s) => s.imei).map((s) => [s.imei!.replace(/\D/g, ''), s.numerEwidencyjny])),
    karty: karty.map((c) => ({ id: c.id, iccid: c.iccid, numerTelefonu: c.numerTelefonu, telefon: c.phone?.numerEwidencyjny ?? null })),
    dzialy: new Map(dzialy.map((d) => [doPorownania(d.nazwa), d])),
  };
}

class Wiersz {
  dane: Record<string, unknown> = {};
  readonly wartosci: Record<string, WartoscImportu> = {};
  readonly bledy: UwagaImportu[] = [];
  readonly ostrzezenia: UwagaImportu[] = [];
  uzytkownikId: number | null = null;
  /** Pracownik: nazwa działu (istniejącego albo do utworzenia). */
  dzial: string | null = null;

  constructor(
    readonly nr: number,
    private readonly surowe: Record<string, string>,
  ) {}

  /** Wartość komórki; „-”, „brak”, „b/d” itp. znaczą „nic” — ale tylko w polach opcjonalnych: w wymaganych
   *  to świadomy wpis (formularz też przyjmie „bd” jako numer seryjny składaka bez numeru). */
  tekst(klucz: string, wymagane = false): string | null {
    const wartosc = this.surowe[klucz]?.trim() ?? '';
    if (wartosc === '') return null;
    return !wymagane && k.pusta(wartosc) ? null : wartosc;
  }

  ustaw(klucz: string, wartosc: string | number) {
    this.dane[klucz] = wartosc;
    this.wartosci[klucz] = wartosc;
  }

  z<T extends string | number>(klucz: string, konwersja: k.Konwersja<T>) {
    if (konwersja.ok) this.ustaw(klucz, konwersja.wartosc);
    else this.blad(klucz, konwersja.blad);
  }

  blad(pole: string | null, komunikat: string) {
    this.bledy.push({ pole, komunikat });
  }

  ostrzezenie(pole: string | null, komunikat: string) {
    this.ostrzezenia.push({ pole, komunikat });
  }

  maBlad(pole: string) {
    return this.bledy.some((b) => b.pole === pole);
  }

  wynik(): WierszImportu {
    return { nr: this.nr, wartosci: this.wartosci, bledy: this.bledy, ostrzezenia: this.ostrzezenia };
  }
}

function przypiszUzytkownika(w: Wiersz, tekst: string, ctx: Kontekst) {
  const kandydaci = tekst.includes('@')
    ? [ctx.pracownicyPoEmailu.get(tekst.toLowerCase())].filter((p): p is Pracownik => p !== undefined)
    : (ctx.pracownicyPoNazwie.get(kluczOsoby(tekst)) ?? []);
  const aktywni = kandydaci.filter((p) => p.aktywny);
  if (kandydaci.length === 0) {
    w.blad('uzytkownik', `Nie ma w ewidencji pracownika „${tekst}” — dodaj go (albo zaimportuj pracowników) i sprawdź ponownie`);
  } else if (aktywni.length === 0) {
    w.blad('uzytkownik', `„${tekst}” to nieaktywny pracownik — nie można mu przypisać sprzętu`);
  } else if (aktywni.length > 1) {
    w.blad('uzytkownik', `Kilku pracowników nazywa się „${tekst}” — wpisz ich e-mail zamiast nazwiska`);
  } else {
    const p = aktywni[0];
    w.uzytkownikId = p.id;
    w.wartosci.uzytkownik = `${p.imie} ${p.nazwisko} (${p.dzial.nazwa})`;
  }
}

function podlaczKarteSim(w: Wiersz, tekst: string, ctx: Kontekst, partia: Partia) {
  const klucz = k.kluczTelefonu(tekst);
  const karty = klucz.length === 9 ? ctx.karty.filter((c) => k.kluczTelefonu(c.numerTelefonu) === klucz) : [];
  if (klucz.length < 9) {
    w.blad('numerTelefonu', `Nieprawidłowy numer telefonu „${tekst}”`);
  } else if (karty.length === 0) {
    w.blad('numerTelefonu', `Nie ma karty SIM z numerem ${tekst} — najpierw zaimportuj karty SIM albo pomiń tę kolumnę`);
  } else if (karty.length > 1) {
    w.blad('numerTelefonu', `Kilka kart SIM ma numer ${tekst} — przypisz kartę do telefonu ręcznie`);
  } else if (karty[0].telefon) {
    w.blad('numerTelefonu', `Karta SIM ${karty[0].numerTelefonu} jest już w telefonie ${karty[0].telefon}`);
  } else if (partia.karty.has(karty[0].id)) {
    w.blad('numerTelefonu', `Ta sama karta SIM co w wierszu ${partia.karty.get(karty[0].id)}`);
  } else {
    partia.karty.set(karty[0].id, w.nr);
    w.dane.simCardId = karty[0].id;
    w.wartosci.numerTelefonu = karty[0].numerTelefonu;
  }
}

function rozdzielImieNazwisko(w: Wiersz, klucz: string, tekst: string) {
  const czesci = tekst.split(/\s+/);
  if (czesci.length < 2) {
    w.blad(klucz, `„${tekst}” — potrzeba imienia i nazwiska, np. Anna Nowak`);
    return;
  }
  const [nazwisko, imie] =
    klucz === 'nazwiskoImie' ? [czesci[0], czesci.slice(1).join(' ')] : [czesci[czesci.length - 1], czesci.slice(0, -1).join(' ')];
  w.ustaw('imie', imie);
  w.ustaw('nazwisko', nazwisko);
}

function przetworzPola(w: Wiersz, ctx: Kontekst, partia: Partia) {
  for (const { klucz, wymagane } of POLA_IMPORTU[ctx.typ]) {
    const t = w.tekst(klucz, wymagane);
    if (t === null) continue;
    if (IDENTYFIKATORY.has(klucz) && k.notacjaNaukowa(t)) {
      w.blad(klucz, k.KOMUNIKAT_NOTACJI);
      continue;
    }
    switch (klucz) {
      case 'typ':
        w.z('typ', ctx.typ === 'TELEFON' ? k.typTelefonu(t) : k.typKomputera(t));
        break;
      case 'ramIloscGb':
        w.z(klucz, k.ramGb(t));
        break;
      case 'ramRodzaj':
        w.z(klucz, k.rodzajRam(t));
        break;
      case 'systemOperacyjny':
        w.z(klucz, k.systemOperacyjny(t));
        break;
      case 'macEthernet':
      case 'macWifi':
      case 'mac':
        w.z(klucz, k.adresMac(t));
        break;
      case 'adresIP':
        w.z(klucz, k.adresIp(t));
        break;
      case 'dataZakupu':
      case 'dataKoncaGwarancji':
      case 'dataKoncaUmowy':
        w.z(klucz, k.data(t));
        break;
      case 'kosztBruttoGrosze':
      case 'kosztMiesiecznyGrosze':
        w.z(klucz, k.kwotaGrosze(t));
        break;
      case 'wielkoscEkranu':
        w.z(klucz, k.liczbaDziesietna(t, '24 albo 23,8'));
        break;
      case 'uzytkownik':
        przypiszUzytkownika(w, t, ctx);
        break;
      case 'numerTelefonu':
        if (ctx.typ === 'TELEFON') podlaczKarteSim(w, t, ctx, partia);
        else w.ustaw(klucz, t);
        break;
      case 'imieNazwisko':
      case 'nazwiskoImie':
        rozdzielImieNazwisko(w, klucz, t);
        break;
      case 'dzial': {
        const istniejacy = ctx.dzialy.get(doPorownania(t));
        w.dzial = istniejacy?.nazwa ?? t;
        w.wartosci.dzial = w.dzial;
        break;
      }
      default:
        w.ustaw(klucz, t);
    }
  }

  // Wartości domyślne, gdy kolumny nie ma albo komórka jest pusta.
  if (ctx.typ === 'KOMPUTER' && w.dane.ramRodzaj === undefined && !w.maBlad('ramRodzaj')) {
    w.ustaw('ramRodzaj', k.generacjaRam(w.tekst('ramIloscGb') ?? '') ?? 'INNY');
  }
  if (ctx.typ === 'TELEFON' && w.dane.typ === undefined && !w.maBlad('typ')) {
    w.ustaw('typ', 'SMARTFON');
  }
  if (ctx.typ === 'PRACOWNIK' && !w.dzial) {
    w.blad('dzial', 'Pole „Dział” jest wymagane');
  }
}

/** Walidacja schematem tworzenia (długości, wymagane pola) — błędy tylko dla pól bez błędu interpretacji. */
function zwaliduj(w: Wiersz, ctx: Kontekst) {
  const pola = POLA_IMPORTU[ctx.typ];
  const pominiete = new Set(pola.filter((p) => p.zastepuje && w.maBlad(p.klucz)).flatMap((p) => p.zastepuje!));
  const wynik = SCHEMATY[ctx.typ].safeParse(w.dane);
  if (wynik.success) {
    w.dane = wynik.data;
    return;
  }
  for (const issue of wynik.error.issues) {
    const pole = typeof issue.path[0] === 'string' ? (issue.path[0] === 'simCardId' ? 'numerTelefonu' : issue.path[0]) : null;
    if (pole && (w.maBlad(pole) || pominiete.has(pole))) continue;
    const etykieta = pola.find((p) => p.klucz === pole)?.etykieta ?? pole;
    const brak = issue.code === 'invalid_type' && issue.received === 'undefined';
    w.blad(pole, brak ? `Pole „${etykieta}” jest wymagane` : issue.message);
  }
}

function powtorzony<K>(mapa: Map<K, number>, klucz: K, nr: number): number | null {
  const poprzedni = mapa.get(klucz);
  if (poprzedni !== undefined) return poprzedni;
  mapa.set(klucz, nr);
  return null;
}

function sprawdzDuplikaty(w: Wiersz, ctx: Kontekst, partia: Partia) {
  const d = w.dane as Record<string, string | undefined>;

  if (d.numerEwidencyjny && !w.maBlad('numerEwidencyjny')) {
    const klucz = d.numerEwidencyjny.toLowerCase();
    const wiersz = ctx.numery.has(klucz) ? null : powtorzony(partia.numery, klucz, w.nr);
    if (ctx.numery.has(klucz)) w.blad('numerEwidencyjny', `${d.numerEwidencyjny} już jest w ewidencji`);
    else if (wiersz) w.blad('numerEwidencyjny', `Ten sam numer ewidencyjny co w wierszu ${wiersz}`);
  }

  // „bd”, „-” w numerze seryjnym (składak bez numeru) to nie duplikat.
  if (d.numerSeryjny && !k.pusta(d.numerSeryjny) && !w.maBlad('numerSeryjny')) {
    const klucz = kompaktowy(d.numerSeryjny);
    const istniejacy = ctx.seryjne.get(klucz);
    const wiersz = powtorzony(partia.seryjne, klucz, w.nr);
    if (istniejacy) w.ostrzezenie('numerSeryjny', `Ten numer seryjny ma już ${istniejacy}`);
    else if (wiersz) w.ostrzezenie('numerSeryjny', `Ten sam numer seryjny co w wierszu ${wiersz}`);
  }

  if (ctx.typ === 'TELEFON' && d.imei && !w.maBlad('imei')) {
    const cyfry = d.imei.replace(/\D/g, '');
    if (cyfry.length !== 15) w.ostrzezenie('imei', 'IMEI ma zwykle 15 cyfr — sprawdź, czy to pełny numer');
    else if (!k.luhnPoprawny(cyfry)) w.ostrzezenie('imei', 'IMEI nie przechodzi sumy kontrolnej — sprawdź, czy nie ma literówki');
    const istniejacy = ctx.imei.get(cyfry);
    const wiersz = powtorzony(partia.imei, cyfry, w.nr);
    if (istniejacy) w.ostrzezenie('imei', `Ten IMEI ma już telefon ${istniejacy}`);
    else if (wiersz) w.ostrzezenie('imei', `Ten sam IMEI co w wierszu ${wiersz}`);
  }

  if (ctx.typ === 'KARTA_SIM') {
    if (d.iccid && !w.maBlad('iccid')) {
      const klucz = kompaktowy(d.iccid);
      const istniejaca = ctx.karty.find((c) => kompaktowy(c.iccid) === klucz);
      const wiersz = istniejaca ? null : powtorzony(partia.iccid, klucz, w.nr);
      if (istniejaca) w.blad('iccid', `Karta ${d.iccid} już jest w ewidencji (numer ${istniejaca.numerTelefonu})`);
      else if (wiersz) w.blad('iccid', `Ten sam ICCID co w wierszu ${wiersz}`);
      // Excel trzyma 15 cyfr znaczących — dłuższy ICCID z komórki liczbowej kończy się zerami.
      if (/^\d{16,}$/.test(klucz) && /000$/.test(klucz) && !k.luhnPoprawny(klucz)) {
        w.ostrzezenie('iccid', 'ICCID kończy się zerami i nie przechodzi sumy kontrolnej — Excel mógł obciąć cyfry (kolumna powinna mieć format „Tekst”)');
      }
    }
    if (d.numerTelefonu && !w.maBlad('numerTelefonu')) {
      const klucz = k.kluczTelefonu(d.numerTelefonu);
      const istniejaca = ctx.karty.find((c) => k.kluczTelefonu(c.numerTelefonu) === klucz);
      const wiersz = powtorzony(partia.telefony, klucz, w.nr);
      if (istniejaca) w.ostrzezenie('numerTelefonu', `Ten numer ma już karta SIM ${istniejaca.iccid}`);
      else if (wiersz) w.ostrzezenie('numerTelefonu', `Ten sam numer co w wierszu ${wiersz}`);
    }
  }

  if (ctx.typ === 'PRACOWNIK') {
    if (d.imie && d.nazwisko) {
      const klucz = kluczOsoby(`${d.imie} ${d.nazwisko}`);
      const wiersz = ctx.pracownicyPoNazwie.has(klucz) ? null : powtorzony(partia.osoby, klucz, w.nr);
      if (ctx.pracownicyPoNazwie.has(klucz)) {
        w.blad(null, `${d.imie} ${d.nazwisko} już jest w ewidencji — drugą osobę o tym samym imieniu i nazwisku dodaj ręcznie`);
      } else if (wiersz) {
        w.blad(null, `Ta sama osoba co w wierszu ${wiersz}`);
      }
    }
    if (d.email && !w.maBlad('email')) {
      const klucz = d.email.toLowerCase();
      const istniejacy = ctx.pracownicyPoEmailu.get(klucz);
      const wiersz = powtorzony(partia.emaile, klucz, w.nr);
      if (istniejacy) w.ostrzezenie('email', `Ten e-mail ma już ${istniejacy.imie} ${istniejacy.nazwisko}`);
      else if (wiersz) w.ostrzezenie('email', `Ten sam e-mail co w wierszu ${wiersz}`);
    }
  }
}

function przetworz(input: ImportInput, ctx: Kontekst): Wiersz[] {
  const partia: Partia = {
    numery: new Map(),
    seryjne: new Map(),
    imei: new Map(),
    iccid: new Map(),
    telefony: new Map(),
    karty: new Map(),
    osoby: new Map(),
    emaile: new Map(),
  };
  return input.wiersze.map(({ nr, dane }) => {
    const w = new Wiersz(nr, dane);
    przetworzPola(w, ctx, partia);
    zwaliduj(w, ctx);
    sprawdzDuplikaty(w, ctx, partia);
    return w;
  });
}

/** Działy do utworzenia — tylko z poprawnych wierszy (błędne nie zostaną zaimportowane). */
function noweDzialy(wiersze: Wiersz[], ctx: Kontekst): Map<string, string> {
  const nowe = new Map<string, string>();
  for (const w of wiersze) {
    if (w.bledy.length > 0 || !w.dzial) continue;
    const klucz = doPorownania(w.dzial);
    if (!ctx.dzialy.has(klucz) && !nowe.has(klucz)) nowe.set(klucz, w.dzial);
  }
  return nowe;
}

async function utworzSprzet(tx: Prisma.TransactionClient, typ: EquipmentType, data: Record<string, unknown>): Promise<{ id: number }> {
  switch (typ) {
    case 'KOMPUTER':
      return tx.computer.create({ data: data as Prisma.ComputerUncheckedCreateInput });
    case 'MONITOR':
      return tx.monitor.create({ data: data as Prisma.MonitorUncheckedCreateInput });
    case 'MYSZ':
      return tx.mouse.create({ data: data as Prisma.MouseUncheckedCreateInput });
    case 'KLAWIATURA':
      return tx.keyboard.create({ data: data as Prisma.KeyboardUncheckedCreateInput });
    case 'TELEFON':
      return tx.phone.create({ data: data as Prisma.PhoneUncheckedCreateInput });
    case 'KARTA_SIM':
      return tx.simCard.create({ data: data as Prisma.SimCardUncheckedCreateInput });
    case 'DRUKARKA':
      return tx.printer.create({ data: data as Prisma.PrinterUncheckedCreateInput });
  }
}

/**
 * Import z Excela/CSV: `zapisz: false` tylko sprawdza (podgląd z interpretacją i błędami),
 * `zapisz: true` dodatkowo zapisuje poprawne wiersze — w jednej transakcji, z historią zmian
 * i historią przypisań, po kopii zapasowej bazy (import łatwo zrobić, trudno odkręcić ręcznie).
 */
export async function importuj(input: ImportInput, appUserId: number): Promise<WynikImportu> {
  const ctx = await wczytajKontekst(input.typ);
  const wiersze = przetworz(input, ctx);
  const poprawne = wiersze.filter((w) => w.bledy.length === 0);
  const dzialy = noweDzialy(wiersze, ctx);
  const wynik: WynikImportu = {
    wiersze: wiersze.map((w) => w.wynik()),
    poprawne: poprawne.length,
    zBledami: wiersze.length - poprawne.length,
    noweDzialy: [...dzialy.values()],
  };
  if (!input.zapisz) return wynik;
  if (poprawne.length === 0) throw new AppError(400, 'Żaden wiersz nie jest poprawny — nie ma czego zaimportować');

  let kopia: string | null = null;
  let bladKopii: string | null = null;
  try {
    kopia = (await utworzKopie('PRZED_IMPORTEM')).nazwa;
  } catch (err) {
    bladKopii = err instanceof Error ? err.message : String(err);
  }

  await prisma.$transaction(
    async (tx) => {
      const idDzialow = new Map([...ctx.dzialy].map(([klucz, d]) => [klucz, d.id]));
      for (const w of poprawne) {
        if (input.typ === 'PRACOWNIK') {
          const klucz = doPorownania(w.dzial!);
          let dzialId = idDzialow.get(klucz);
          if (dzialId === undefined) {
            dzialId = (await tx.department.create({ data: { nazwa: dzialy.get(klucz) ?? w.dzial! } })).id;
            idDzialow.set(klucz, dzialId);
          }
          const pracownik = await tx.employee.create({
            data: { ...(w.dane as Omit<Prisma.EmployeeUncheckedCreateInput, 'dzialId'>), dzialId },
            include: { dzial: true },
          });
          await zapiszZmiane({
            klient: tx,
            encja: 'PRACOWNIK',
            encjaId: pracownik.id,
            operacja: 'UTWORZENIE',
            po: pracownikDoHistorii(pracownik),
            appUserId,
            kontekst: KONTEKST_HISTORII,
          });
          continue;
        }

        const typ = input.typ;
        const item = await utworzSprzet(tx, typ, w.uzytkownikId ? { ...w.dane, aktualnyUzytkownikId: w.uzytkownikId } : w.dane);
        if (w.uzytkownikId) {
          await tx.assignmentHistory.create({
            data: { sprzetTyp: typ, sprzetId: item.id, uzytkownikId: w.uzytkownikId, notatka: KONTEKST_HISTORII, utworzylAppUserId: appUserId },
          });
        }
        await zapiszZmiane({
          klient: tx,
          encja: typ,
          encjaId: item.id,
          operacja: 'UTWORZENIE',
          po: item as unknown as Record<string, unknown>,
          appUserId,
          kontekst: KONTEKST_HISTORII,
        });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  wynik.zapisano = { liczba: poprawne.length, kopia, bladKopii };
  return wynik;
}

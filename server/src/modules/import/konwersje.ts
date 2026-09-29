import {
  COMPUTER_TYPES,
  PHONE_TYPES,
  RAM_TYPES,
  SYSTEMY_OPERACYJNE,
  type ComputerType,
  type PhoneType,
  type RamType,
  type SystemOperacyjny,
} from 'shared';
import { doPorownania } from '../../utils/tekst';

/**
 * Interpretacja komórek z Excela/CSV: wartości wpisane „po ludzku” (16 GB DDR4, Windows 11 Pro,
 * 5 999,00 zł, 15.03.2024, 00-1A-2B-3C-4D-5E) → wartości pól ewidencji. Błąd to komunikat
 * dla admina z przykładem poprawnego zapisu.
 */
export type Konwersja<T> = { ok: true; wartosc: T } | { ok: false; blad: string };

const ok = <T>(wartosc: T): Konwersja<T> => ({ ok: true, wartosc });
const blad = <T>(komunikat: string): Konwersja<T> => ({ ok: false, blad: komunikat });

/** Wartości oznaczające w arkuszach „nic” — traktowane jak pusta komórka. */
const PUSTE = new Set(['-', '–', '—', 'brak', 'b/d', 'bd', 'n/a', 'nie dotyczy', 'nd', 'nie ma']);

export function pusta(tekst: string | undefined): boolean {
  if (tekst === undefined) return true;
  const t = doPorownania(tekst);
  return t === '' || PUSTE.has(t);
}

/** Excel pokazuje długie liczby (IMEI, ICCID, numery seryjne) jako 3,52E+14 i obcina cyfry. */
export function notacjaNaukowa(tekst: string): boolean {
  return /^\d+(?:[.,]\d+)?e\+?\d+$/i.test(tekst.replace(/\s/g, ''));
}

export const KOMUNIKAT_NOTACJI =
  'Excel zapisał liczbę w notacji naukowej (np. 3,52E+14) i obciął cyfry — ustaw kolumnie format „Tekst” i skopiuj ponownie';

export function typKomputera(tekst: string): Konwersja<ComputerType> {
  const klucz = tekst.trim().toUpperCase();
  if ((COMPUTER_TYPES as readonly string[]).includes(klucz)) return ok(klucz as ComputerType);
  const t = doPorownania(tekst);
  if (/laptop|notebook|ultrabook|netbook|przenosny/.test(t)) return ok('LAPTOP');
  if (/\baio\b|all[- ]?in[- ]?one/.test(t)) return ok('AIO');
  if (/serwer|server/.test(t)) return ok('SERWER');
  if (/stacjonarn|desktop|\bpc\b|tower|mini ?pc|\bsff\b|biurkow/.test(t)) return ok('STACJONARNY');
  return blad(`Nieznany typ „${tekst}” — wpisz: laptop, stacjonarny, AiO albo serwer`);
}

export function typTelefonu(tekst: string): Konwersja<PhoneType> {
  const klucz = tekst.trim().toUpperCase();
  if ((PHONE_TYPES as readonly string[]).includes(klucz)) return ok(klucz as PhoneType);
  const t = doPorownania(tekst);
  if (/kolektor|terminal|skaner|zebra|honeywell/.test(t)) return ok('KOLEKTOR');
  if (/smartf|smartphone|telefon|komork/.test(t)) return ok('SMARTFON');
  return blad(`Nieznany typ „${tekst}” — wpisz: smartfon albo kolektor`);
}

/** Generacja pamięci z dowolnego opisu („16 GB DDR4”, „LPDDR5X”) — w ewidencji liczy się generacja. */
export function generacjaRam(tekst: string): RamType | null {
  const m = /ddr\s*([345])/.exec(doPorownania(tekst));
  return m ? (`DDR${m[1]}` as RamType) : null;
}

export function rodzajRam(tekst: string): Konwersja<RamType> {
  const klucz = tekst.trim().toUpperCase();
  if ((RAM_TYPES as readonly string[]).includes(klucz)) return ok(klucz as RamType);
  const generacja = generacjaRam(tekst);
  if (generacja) return ok(generacja);
  if (/^inn/.test(doPorownania(tekst))) return ok('INNY');
  return blad(`Nieznany rodzaj RAM „${tekst}” — wpisz DDR3, DDR4, DDR5 albo „inny”`);
}

export function ramGb(tekst: string): Konwersja<number> {
  // Bez liczb, które nie są pojemnością: „DDR4”, „LPDDR5X”, „3200 MHz”.
  const t = doPorownania(tekst)
    .replace(/,/g, '.')
    .replace(/(lp)?ddr\s*\d\w*/g, ' ')
    .replace(/\d+\s*(mhz|mt\/s)/g, ' ');
  // „2x8 GB” — moduły
  const moduly = /(\d+)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(gb|g|mb)?\b/.exec(t);
  let gb: number;
  if (moduly) {
    gb = (Number(moduly[1]) * Number(moduly[2])) / (moduly[3] === 'mb' ? 1024 : 1);
  } else {
    const m = /(\d+(?:\.\d+)?)\s*(tb|gb|g|mb)\b/.exec(t) ?? /(\d+(?:\.\d+)?)()/.exec(t);
    if (!m) return blad(`Nie rozpoznano ilości RAM „${tekst}” — wpisz liczbę GB, np. 16`);
    gb = Number(m[1]) * (m[2] === 'mb' ? 1 / 1024 : m[2] === 'tb' ? 1024 : 1);
  }
  const wynik = Math.round(gb);
  return wynik > 0 ? ok(wynik) : blad(`Nie rozpoznano ilości RAM „${tekst}” — wpisz liczbę GB, np. 16`);
}

export function systemOperacyjny(tekst: string): Konwersja<SystemOperacyjny> {
  const klucz = tekst.trim().toUpperCase();
  if ((SYSTEMY_OPERACYJNE as readonly string[]).includes(klucz)) return ok(klucz as SystemOperacyjny);
  const t = doPorownania(tekst);
  if (/server/.test(t)) return ok('WINDOWS_SERVER');
  if (/mac ?os|os ?x|\bmac\b|sonoma|sequoia|ventura|monterey/.test(t)) return ok('MACOS');
  if (/linux|ubuntu|debian|fedora|mint|red ?hat|centos|suse/.test(t)) return ok('LINUX');
  if (/chrome/.test(t)) return ok('CHROMEOS');
  const windows = /\bw(?:in(?:dows)?)?\s*(10|11)\b/.exec(t);
  if (windows) {
    const wersja = windows[1];
    if (/home|domow/.test(t)) return ok(`WINDOWS_${wersja}_HOME` as SystemOperacyjny);
    // Enterprise/Education to też edycje firmowe — w ewidencji liczą się jak Pro (Entra ID, BitLocker).
    if (/\bpro\b|professional|enterprise|education|business|\bedu\b/.test(t)) {
      return ok(`WINDOWS_${wersja}_PRO` as SystemOperacyjny);
    }
    return blad(`Brak edycji Windows w „${tekst}” — wpisz np. „Windows ${wersja} Pro” albo „Windows ${wersja} Home”`);
  }
  if (/windows|\bwin\b|inny|other/.test(t)) return ok('INNY');
  return blad(`Nieznany system „${tekst}” — wpisz np. Windows 11 Pro, macOS, Linux albo „inny”`);
}

export function adresMac(tekst: string): Konwersja<string> {
  const t = tekst.trim();
  const hex = t.replace(/[^0-9a-f]/gi, '');
  if (!/^[0-9a-f:\-. ]+$/i.test(t) || hex.length !== 12) {
    return blad(`Nieprawidłowy adres MAC „${tekst}” — potrzeba 12 znaków szesnastkowych, np. 00:1A:2B:3C:4D:5E`);
  }
  return ok(hex.toUpperCase().match(/../g)!.join(':'));
}

export function adresIp(tekst: string): Konwersja<string> {
  const t = tekst.trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t);
  if (!m || m.slice(1).some((oktet) => Number(oktet) > 255)) {
    return blad(`Nieprawidłowy adres IP „${tekst}” — np. 192.168.1.50`);
  }
  return ok(t);
}

const EXCEL_EPOKA = Date.UTC(1899, 11, 30);

/** Data jako RRRR-MM-DD (tak jak z pola daty w formularzu). */
export function data(tekst: string): Konwersja<string> {
  const t = tekst.trim();
  let r: number;
  let m: number;
  let d: number;
  let dopasowanie: RegExpExecArray | null;
  if ((dopasowanie = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T].*)?$/.exec(t))) {
    [r, m, d] = [Number(dopasowanie[1]), Number(dopasowanie[2]), Number(dopasowanie[3])];
  } else if ((dopasowanie = /^(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})(?:\s.*)?$/.exec(t))) {
    [d, m, r] = [Number(dopasowanie[1]), Number(dopasowanie[2]), Number(dopasowanie[3])];
    if (r < 100) r += 2000;
    // 03/15/2024 — amerykański zapis (miesiąc pierwszy) rozpoznawalny tylko, gdy dzień > 12.
    if (m > 12 && d <= 12) [d, m] = [m, d];
  } else if (/^\d{5}$/.test(t) && Number(t) > 20000 && Number(t) < 80000) {
    // Liczba seryjna daty z Excela (komórka bez formatu daty).
    const dataExcel = new Date(EXCEL_EPOKA + Number(t) * 86_400_000);
    [r, m, d] = [dataExcel.getUTCFullYear(), dataExcel.getUTCMonth() + 1, dataExcel.getUTCDate()];
  } else {
    return blad(`Nieprawidłowa data „${tekst}” — wpisz np. 15.03.2024`);
  }
  const wynik = new Date(Date.UTC(r, m - 1, d));
  if (wynik.getUTCFullYear() !== r || wynik.getUTCMonth() !== m - 1 || wynik.getUTCDate() !== d || r < 1990 || r > 2100) {
    return blad(`Nieprawidłowa data „${tekst}” — wpisz np. 15.03.2024`);
  }
  return ok(wynik.toISOString().slice(0, 10));
}

/** Kwota w złotych → grosze. „5 999,00 zł”, „5999.00”, „5.999,00”, „1 500” */
export function kwotaGrosze(tekst: string): Konwersja<number> {
  let t = tekst.replace(/[\s\u00a0]/g, '').replace(/zł|zl|pln|brutto|netto/gi, '');
  if (!/^\d[\d.,]*$/.test(t)) return blad(`Nieprawidłowa kwota „${tekst}” — wpisz np. 5 999,00`);
  const przecinki = (t.match(/,/g) ?? []).length;
  const kropki = (t.match(/\./g) ?? []).length;
  if (przecinki > 0 && kropki > 0) {
    // Separatorem dziesiętnym jest ten, który występuje później.
    const dziesietny = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.';
    t = t.replace(dziesietny === ',' ? /\./g : /,/g, '').replace(dziesietny, '.');
  } else if (przecinki > 1 || kropki > 1) {
    t = t.replace(/[.,]/g, ''); // same separatory tysięcy
  } else if (kropki === 1 && /\.\d{3}$/.test(t)) {
    t = t.replace('.', ''); // „1.500” — kropka jako separator tysięcy
  } else {
    t = t.replace(',', '.');
  }
  const kwota = Number(t);
  if (!Number.isFinite(kwota)) return blad(`Nieprawidłowa kwota „${tekst}” — wpisz np. 5 999,00`);
  return ok(Math.round(kwota * 100));
}

export function liczbaDziesietna(tekst: string, przyklad: string): Konwersja<number> {
  const m = /(\d+(?:[.,]\d+)?)/.exec(tekst);
  const liczba = m ? Number(m[1].replace(',', '.')) : NaN;
  return liczba > 0 ? ok(liczba) : blad(`Nieprawidłowa liczba „${tekst}” — wpisz np. ${przyklad}`);
}

/** Suma kontrolna Luhna (IMEI, ICCID) — wykrywa literówki i obcięte przez Excela cyfry. */
export function luhnPoprawny(cyfry: string): boolean {
  let suma = 0;
  for (let i = 0; i < cyfry.length; i++) {
    let c = Number(cyfry[cyfry.length - 1 - i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    suma += c;
  }
  return suma % 10 === 0;
}

/** Ostatnie 9 cyfr numeru telefonu — „+48 601 234 567” i „601234567” to ten sam numer. */
export function kluczTelefonu(tekst: string): string {
  return tekst.replace(/\D/g, '').slice(-9);
}

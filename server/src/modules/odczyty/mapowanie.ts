import {
  rozmiarDysku,
  TYPY_PAMIECI_SMBIOS,
  type ComputerType,
  type DaneOdczytu,
  type PoleOdczytu,
  type RamType,
  type SystemOperacyjny,
} from 'shared';

/**
 * Tłumaczy surowe dane z WMI (DaneOdczytu) na propozycje wartości pól komputera.
 * Wszystko jest „best effort”: pole, którego nie da się wiarygodnie ustalić, po prostu
 * nie dostaje propozycji (admin i tak przegląda odczyt przed zapisaniem czegokolwiek).
 */

export interface PropozycjaOdczytu {
  markaModel?: string;
  numerSeryjny?: string;
  typ?: ComputerType;
  cpu?: string;
  ramIloscGb?: number;
  ramRodzaj?: RamType;
  pojemnoscDysku?: string;
  systemOperacyjny?: SystemOperacyjny;
  wersjaSystemu?: string;
  macEthernet?: string;
  macWifi?: string;
}

export interface WynikMapowania {
  propozycja: PropozycjaOdczytu;
  /** Krótkie wyjaśnienia przy polach, np. „odczytano LPDDR5” albo pominięta karta USB. */
  uwagi: Partial<Record<PoleOdczytu, string>>;
}

/** Wartości zastępcze, które producenci płyt wpisują w pola SMBIOS zamiast prawdziwych danych. */
const WARTOSCI_ZASTEPCZE = new Set([
  'TOBEFILLEDBYOEM',
  'DEFAULTSTRING',
  'SYSTEMSERIALNUMBER',
  'SYSTEMPRODUCTNAME',
  'SYSTEMMANUFACTURER',
  'SYSTEMVERSION',
  'CHASSISSERIALNUMBER',
  'BASEBOARDSERIALNUMBER',
  'CHASSISMANUFACTURE',
  'CHASSISMANUFACTURER',
  'ALLSERIES',
  'NONE',
  'NA',
  'NOTAPPLICABLE',
  'NOTSPECIFIED',
  'NOTAVAILABLE',
  'UNKNOWN',
  'INVALID',
  'OEM',
  'SERIAL',
  'TYPE1PRODUCTCONFIGID',
  '123456789',
  '0123456789',
  '1234567890',
]);

export function czyWartoscZastepcza(wartosc: string | null | undefined): boolean {
  if (!wartosc) return true;
  const klucz = wartosc.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return klucz === '' || WARTOSCI_ZASTEPCZE.has(klucz) || /^(0+|X+|F+)$/.test(klucz);
}

const PRODUCENCI: [RegExp, string][] = [
  [/^lenovo/i, 'Lenovo'],
  [/^(hp\b|hewlett[- ]?packard)/i, 'HP'],
  [/^dell/i, 'Dell'],
  [/^asus/i, 'ASUS'],
  [/^acer/i, 'Acer'],
  [/^(micro-star|msi\b)/i, 'MSI'],
  [/^microsoft/i, 'Microsoft'],
  [/^apple/i, 'Apple'],
  [/^fujitsu/i, 'Fujitsu'],
  [/^gigabyte/i, 'Gigabyte'],
  [/^asrock/i, 'ASRock'],
  [/^samsung/i, 'Samsung'],
  [/^toshiba/i, 'Toshiba'],
  [/^dynabook/i, 'Dynabook'],
  [/^huawei/i, 'Huawei'],
  [/^medion/i, 'Medion'],
  [/^intel/i, 'Intel'],
  [/^vmware/i, 'VMware'],
];

export function normalizujProducenta(surowy: string): string {
  for (const [wzorzec, nazwa] of PRODUCENCI) {
    if (wzorzec.test(surowy.trim())) return nazwa;
  }
  const bezFormy = surowy
    .replace(/,?\s+(inc\.?|corporation|corp\.?|co\.,?\s*ltd\.?|ltd\.?|gmbh|s\.?a\.?|computer inc\.?)$/i, '')
    .trim();
  // „FUJITSU CLIENT COMPUTING” itp. — pełne wielkie litery wyglądają w ewidencji jak krzyk.
  if (bezFormy.length > 4 && bezFormy === bezFormy.toUpperCase()) {
    return bezFormy.toLowerCase().replace(/\b\p{L}/gu, (l) => l.toUpperCase());
  }
  return bezFormy;
}

function markaModel(d: DaneOdczytu): string | undefined {
  const producent = d.producent && !czyWartoscZastepcza(d.producent) ? normalizujProducenta(d.producent) : null;
  let model = d.model && !czyWartoscZastepcza(d.model) ? d.model : null;
  // Lenovo: Model to kod maszyny (np. 21AH00BWPB), a nazwa handlowa jest w Version.
  if (producent === 'Lenovo' && d.modelWersja && !czyWartoscZastepcza(d.modelWersja) && !/^lenovo$/i.test(d.modelWersja)) {
    model = d.modelWersja;
  }
  if (model) {
    const czysty = model.replace(/\s+/g, ' ').trim();
    if (producent && !czysty.toLowerCase().startsWith(producent.toLowerCase())) return `${producent} ${czysty}`;
    return czysty;
  }
  // Komputer składany: w polach systemu są wartości zastępcze, zostaje płyta główna.
  if (d.plytaModel && !czyWartoscZastepcza(d.plytaModel)) {
    const plytaProducent =
      d.plytaProducent && !czyWartoscZastepcza(d.plytaProducent) ? normalizujProducenta(d.plytaProducent) : null;
    return `Komputer składany (płyta ${[plytaProducent, d.plytaModel.trim()].filter(Boolean).join(' ')})`;
  }
  return producent ?? undefined;
}

function numerSeryjny(d: DaneOdczytu): string | undefined {
  for (const kandydat of [d.numerSeryjnyBios, d.numerSeryjnyProduktu, d.numerSeryjnyObudowy]) {
    if (kandydat && !czyWartoscZastepcza(kandydat)) return kandydat.trim();
  }
  return undefined;
}

// Kody SMBIOS typu obudowy (Win32_SystemEnclosure.ChassisTypes).
const OBUDOWY_LAPTOP = new Set([8, 9, 10, 11, 14, 30, 31, 32]);
const OBUDOWY_AIO = new Set([13]);
const OBUDOWY_SERWER = new Set([17, 23, 25, 28]);
const OBUDOWY_STACJONARNE = new Set([3, 4, 5, 6, 7, 15, 16, 24, 34, 35, 36]);

function typKomputera(d: DaneOdczytu): ComputerType | undefined {
  const typProduktu = d.system?.typProduktu;
  if (typProduktu === 2 || typProduktu === 3) return 'SERWER';
  for (const kod of d.typyObudowy) {
    if (OBUDOWY_LAPTOP.has(kod)) return 'LAPTOP';
    if (OBUDOWY_AIO.has(kod)) return 'AIO';
    if (OBUDOWY_SERWER.has(kod)) return 'SERWER';
    if (OBUDOWY_STACJONARNE.has(kod)) return 'STACJONARNY';
  }
  switch (d.typSystemuPc) {
    case 2:
      return 'LAPTOP';
    case 1:
    case 3:
      return 'STACJONARNY';
    case 4:
    case 5:
    case 7:
      return 'SERWER';
    default:
      return undefined;
  }
}

/** „12th Gen Intel(R) Core(TM) i5-1235U” → „Intel Core i5-1235U” (tak jak wpisuje się ręcznie). */
export function oczyscCpu(nazwa: string | null): string | undefined {
  if (!nazwa) return undefined;
  const czysta = nazwa
    .replace(/\((R|TM)\)|®|™/gi, '')
    .replace(/^\d+(st|nd|rd|th) Gen\s+/i, '')
    .replace(/\s*@\s*[\d.]+\s*GHz/i, '')
    .replace(/\s+CPU\b/i, '')
    .replace(/\s+\d+-Core Processor\b/i, '')
    .replace(/\s+with Radeon.*$/i, '')
    .replace(/\s+Processor$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return czysta || undefined;
}

function pamiec(d: DaneOdczytu, uwagi: WynikMapowania['uwagi']): Pick<PropozycjaOdczytu, 'ramIloscGb' | 'ramRodzaj'> {
  const wynik: Pick<PropozycjaOdczytu, 'ramIloscGb' | 'ramRodzaj'> = {};
  const suma = d.pamiec.reduce((acc, m) => acc + (m.pojemnosc ?? 0), 0);
  const bajty = suma > 0 ? suma : (d.ramBajty ?? 0);
  if (bajty > 0) wynik.ramIloscGb = Math.max(1, Math.round(bajty / 1024 ** 3));

  const liczniki = new Map<number, number>();
  for (const m of d.pamiec) {
    if (m.typSmbios !== null && TYPY_PAMIECI_SMBIOS[m.typSmbios]) liczniki.set(m.typSmbios, (liczniki.get(m.typSmbios) ?? 0) + 1);
  }
  const najczestszy = [...liczniki.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (najczestszy !== undefined) {
    const typ = TYPY_PAMIECI_SMBIOS[najczestszy];
    wynik.ramRodzaj = typ.rodzaj;
    if (typ.etykieta !== typ.rodzaj) uwagi.ramRodzaj = `odczytano ${typ.etykieta}`;
  }
  if (d.pamiec.length > 0) {
    uwagi.ramIloscGb = `${d.pamiec.length} ${d.pamiec.length === 1 ? 'moduł' : d.pamiec.length < 5 ? 'moduły' : 'modułów'}`;
  }
  return wynik;
}

// MSFT_PhysicalDisk.BusType: 7 = USB, 12 = karta SD, 14/15 = dyski wirtualne — nie są
// częścią komputera (pendrive, czytnik kart, VHD), więc nie trafiają do opisu dysków.
const MAGISTRALE_POMIJANE = new Set([7, 12, 14, 15]);

function dyski(d: DaneOdczytu): string | undefined {
  const grupy = new Map<string, number>();
  for (const dysk of d.dyski) {
    if (!dysk.rozmiar || dysk.rozmiar < 8e9) continue;
    if (dysk.magistrala !== null && MAGISTRALE_POMIJANE.has(dysk.magistrala)) continue;
    const typ = dysk.typNosnika === 4 || (dysk.typNosnika !== 3 && dysk.magistrala === 17) ? 'SSD' : dysk.typNosnika === 3 ? 'HDD' : '';
    const etykieta = [rozmiarDysku(dysk.rozmiar), typ].filter(Boolean).join(' ');
    grupy.set(etykieta, (grupy.get(etykieta) ?? 0) + 1);
  }
  if (grupy.size === 0) return undefined;
  return [...grupy.entries()].map(([etykieta, ile]) => (ile > 1 ? `${ile}x ${etykieta}` : etykieta)).join(' + ');
}

function system(d: DaneOdczytu): Pick<PropozycjaOdczytu, 'systemOperacyjny' | 'wersjaSystemu'> {
  const s = d.system;
  if (!s) return {};
  const nazwa = (s.nazwa ?? '').replace(/^Microsoft\s+/i, '').trim();
  const edycja = (s.edycja ?? '').toLowerCase();
  const wydanie = s.wersja ?? s.releaseId ?? undefined;
  const kompilacja = s.kompilacja ? Number.parseInt(s.kompilacja, 10) : Number.NaN;

  if ((s.typProduktu !== null && s.typProduktu !== 1) || /server/i.test(nazwa) || edycja.startsWith('server')) {
    const opis = nazwa.replace(/^Windows\s+Server\s*/i, '').trim();
    return { systemOperacyjny: 'WINDOWS_SERVER', wersjaSystemu: [opis, wydanie].filter(Boolean).join(' ') || undefined };
  }
  const windows11 = Number.isFinite(kompilacja) ? kompilacja >= 22000 : /windows 11/i.test(nazwa);
  if (edycja.startsWith('core')) {
    return { systemOperacyjny: windows11 ? 'WINDOWS_11_HOME' : 'WINDOWS_10_HOME', wersjaSystemu: wydanie };
  }
  if (edycja.startsWith('professional')) {
    return { systemOperacyjny: windows11 ? 'WINDOWS_11_PRO' : 'WINDOWS_10_PRO', wersjaSystemu: wydanie };
  }
  if (!nazwa && !edycja) return {};
  // Enterprise, Education, IoT… — słownik ich nie ma, więc „Inny” z pełną nazwą w wersji.
  return { systemOperacyjny: 'INNY', wersjaSystemu: [nazwa || 'Windows', wydanie].filter(Boolean).join(' ') };
}

export function normalizujMac(surowy: string | null | undefined): string | null {
  if (!surowy) return null;
  const hex = surowy.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 12 || /^0+$/.test(hex) || /^F+$/.test(hex)) return null;
  return hex.match(/.{2}/g)!.join(':');
}

function adresyMac(d: DaneOdczytu, uwagi: WynikMapowania['uwagi']): Pick<PropozycjaOdczytu, 'macEthernet' | 'macWifi'> {
  const karty = d.karty
    .map((k) => ({ ...k, macNorm: normalizujMac(k.mac) }))
    .filter((k): k is typeof k & { macNorm: string } => k.macNorm !== null);
  const wynik: Pick<PropozycjaOdczytu, 'macEthernet' | 'macWifi'> = {};

  // Karta USB przy Ethernecie to zwykle stacja dokująca albo przejściówka, która krąży
  // między komputerami — jej MAC nie opisuje tego laptopa, więc nie jest proponowany.
  const ethernet = karty.filter((k) => k.rodzaj === 'ETHERNET');
  const wbudowany = ethernet.find((k) => !k.usb);
  if (wbudowany) wynik.macEthernet = wbudowany.macNorm;
  else if (ethernet.length > 0) uwagi.macEthernet = `pominięto kartę USB (np. stację dokującą): ${ethernet[0].macNorm}`;

  const wifi = karty.filter((k) => k.rodzaj === 'WIFI');
  const wifiWbudowane = wifi.find((k) => !k.usb) ?? wifi[0];
  if (wifiWbudowane) {
    wynik.macWifi = wifiWbudowane.macNorm;
    if (wifiWbudowane.usb) uwagi.macWifi = 'karta Wi-Fi na USB';
  }
  return wynik;
}

export function mapujOdczyt(d: DaneOdczytu): WynikMapowania {
  const uwagi: WynikMapowania['uwagi'] = {};
  const propozycja: PropozycjaOdczytu = {
    markaModel: markaModel(d),
    numerSeryjny: numerSeryjny(d),
    typ: typKomputera(d),
    cpu: oczyscCpu(d.cpu),
    ...pamiec(d, uwagi),
    pojemnoscDysku: dyski(d),
    ...system(d),
    ...adresyMac(d, uwagi),
  };
  // Bez pustych kluczy — „brak propozycji” to brak klucza, nie undefined w JSON-ie.
  for (const klucz of Object.keys(propozycja) as (keyof PropozycjaOdczytu)[]) {
    if (propozycja[klucz] === undefined) delete propozycja[klucz];
  }
  return { propozycja, uwagi };
}

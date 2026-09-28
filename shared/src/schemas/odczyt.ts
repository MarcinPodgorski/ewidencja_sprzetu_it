import { z } from 'zod';
import { computerCreateSchema } from './computer';

/*
 * Dane wysyłane przez skrypt odczytu (server/assets/odczyt/funkcje.ps1, Get-DaneSprzetu).
 * Schemat jest celowo pobłażliwy: WMI potrafi zwrócić puste pola, znaki NUL, liczby jako
 * tekst albo pojedynczy obiekt zamiast tablicy (ConvertTo-Json w PowerShellu 5.1) — zamiast
 * odrzucać cały odczyt, każde pole sprowadzamy do `null`/`[]`, a mapowaniem na pola
 * komputera zajmuje się serwer. Limity długości chronią przed śmieciami w publicznym endpoincie.
 */

/** Tekst z WMI: bez znaków NUL (część BIOS-ów dopełnia nimi pola), przycięty, pusty = null. */
const tekst = (max = 200) =>
  z.preprocess((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v !== 'string') return v;
    const t = v.replace(/\0/g, '').trim();
    return t === '' ? null : t;
  }, z.string().max(max).nullable());

const liczba = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return null;
  return typeof v === 'string' ? Number(v) : v;
}, z.number().finite().nullable());

const flaga = z.preprocess((v) => v === true || v === 'true' || v === 'True', z.boolean());

/** Tablica, która może przyjść jako pojedynczy obiekt (albo w ogóle nie przyjść) — puste
 *  elementy są pomijane (`@($null)` w PowerShellu to tablica z jednym elementem `null`). */
const tablica = <T extends z.ZodTypeAny>(element: T, max: number) =>
  z.preprocess(
    (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]).filter((e) => e !== null && e !== undefined),
    z.array(element).max(max),
  );

const obiektLubNull = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess((v) => (v === undefined ? null : v), z.object(shape).nullable());

export const daneOdczytuSchema = z.object({
  wersjaSkryptu: liczba,
  hostname: tekst(64),
  zalogowanyUzytkownik: tekst(),
  /** Win32_ComputerSystem.Manufacturer / Model. */
  producent: tekst(),
  model: tekst(),
  /** Win32_ComputerSystemProduct.Version — u Lenovo tu jest czytelna nazwa (np. „ThinkPad T14 Gen 3”). */
  modelWersja: tekst(),
  /** Win32_BaseBoard — przy komputerach składanych jedyna sensowna informacja o modelu. */
  plytaProducent: tekst(),
  plytaModel: tekst(),
  numerSeryjnyBios: tekst(),
  numerSeryjnyObudowy: tekst(),
  numerSeryjnyProduktu: tekst(),
  /** Win32_SystemEnclosure.ChassisTypes (kody SMBIOS, np. 10 = notebook, 13 = all-in-one). */
  typyObudowy: tablica(z.number().int(), 16),
  /** Win32_ComputerSystem.PCSystemType (1 = desktop, 2 = mobilny, 4/5/7 = serwer). */
  typSystemuPc: liczba,
  cpu: tekst(),
  /** Win32_ComputerSystem.TotalPhysicalMemory — zapas, gdy nie da się odczytać modułów. */
  ramBajty: liczba,
  pamiec: tablica(z.object({ pojemnosc: liczba, typSmbios: liczba, predkosc: liczba }), 32),
  /** MSFT_PhysicalDisk: typNosnika 3 = HDD, 4 = SSD; magistrala 7 = USB, 17 = NVMe itd. */
  dyski: tablica(z.object({ nazwa: tekst(), rozmiar: liczba, typNosnika: liczba, magistrala: liczba }), 32),
  system: obiektLubNull({
    nazwa: tekst(),
    edycja: tekst(64),
    wersja: tekst(32),
    releaseId: tekst(32),
    kompilacja: tekst(32),
    /** Win32_OperatingSystem.ProductType: 1 = stacja robocza, 2 = kontroler domeny, 3 = serwer. */
    typProduktu: liczba,
  }),
  karty: tablica(
    z.object({ nazwa: tekst(), opis: tekst(), mac: tekst(64), rodzaj: tekst(16), usb: flaga }),
    32,
  ),
  bios: obiektLubNull({ wersja: tekst(), data: tekst(64) }),
  /** Wynik `dsregcmd /status`: DOLACZONY (Entra ID), KONTO_SLUZBOWE (tylko konto), BRAK. */
  entraId: tekst(32),
  /** Ochrona BitLocker dysku systemowego: WLACZONY, WYLACZONY, SZYFROWANIE, WSTRZYMANY. */
  bitlocker: tekst(32),
  /** Komunikaty z nieudanych odczytów poszczególnych elementów (diagnostyka). */
  bledy: tablica(tekst(500), 20),
});
export type DaneOdczytu = z.infer<typeof daneOdczytuSchema>;

export const odczytKodCreateSchema = z.object({
  /** Kod przypięty do komputera: każdy odczyt trafia do niego bez dopasowywania. */
  computerId: z.coerce.number().int().positive().nullish(),
});
export type OdczytKodCreateInput = z.infer<typeof odczytKodCreateSchema>;

export const odczytDopasujSchema = z.object({
  computerId: z.coerce.number().int().positive(),
});
export type OdczytDopasujInput = z.infer<typeof odczytDopasujSchema>;

/** Pola, które admin przepisuje z odczytu do istniejącego komputera (po ewentualnej korekcie). */
const polaOdczytuSchema = computerCreateSchema
  .pick({
    markaModel: true,
    numerSeryjny: true,
    typ: true,
    cpu: true,
    ramIloscGb: true,
    ramRodzaj: true,
    pojemnoscDysku: true,
    systemOperacyjny: true,
    wersjaSystemu: true,
    macEthernet: true,
    macWifi: true,
  })
  .partial();

export const odczytZastosujSchema = z.object({ pola: polaOdczytuSchema });
export type OdczytZastosujInput = z.infer<typeof odczytZastosujSchema>;

/** Nowy komputer z niedopasowanego odczytu — pełna walidacja jak przy zwykłym dodawaniu. */
export const odczytUtworzKomputerSchema = z.object({ komputer: computerCreateSchema });
export type OdczytUtworzKomputerInput = z.infer<typeof odczytUtworzKomputerSchema>;

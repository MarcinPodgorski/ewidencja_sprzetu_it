import { z } from 'zod';

/** Co można zaimportować z Excela/CSV. Pracowników najlepiej najpierw — sprzęt przypisuje się po nazwisku. */
export const TYPY_IMPORTU = ['PRACOWNIK', 'KOMPUTER', 'MONITOR', 'MYSZ', 'KLAWIATURA', 'TELEFON', 'KARTA_SIM', 'DRUKARKA'] as const;
export type TypImportu = (typeof TYPY_IMPORTU)[number];

export interface PoleImportu {
  klucz: string;
  etykieta: string;
  /** Kolumna potrzebna do importu (pole wymagane, bez wartości domyślnej). */
  wymagane?: boolean;
  /** Zmapowanie tego pola zastępuje wymienione (np. „Imię i nazwisko” zamiast osobnych kolumn). */
  zastepuje?: string[];
  /** Nagłówki kolumn rozpoznawane jako to pole — małe litery, bez polskich znaków. */
  naglowki: string[];
  /** Podpowiedź formatu przy mapowaniu kolumn. */
  format?: string;
}

const numerEwidencyjny: PoleImportu = {
  klucz: 'numerEwidencyjny',
  etykieta: 'Numer ewidencyjny',
  wymagane: true,
  naglowki: ['numer ewidencyjny', 'nr ewidencyjny', 'nr ewid', 'ewidencyjny', 'numer inwentarzowy', 'nr inwentarzowy', 'nr inw'],
};
const numerSeryjny: PoleImportu = {
  klucz: 'numerSeryjny',
  etykieta: 'Numer seryjny',
  wymagane: true,
  naglowki: ['numer seryjny', 'nr seryjny', 'nr ser', 's/n', 'sn', 'serial', 'serial number', 'service tag', 'numer fabryczny'],
};
const markaModel: PoleImportu = {
  klucz: 'markaModel',
  etykieta: 'Marka/model',
  wymagane: true,
  naglowki: ['marka/model', 'marka i model', 'model', 'marka', 'producent', 'urzadzenie', 'nazwa'],
};
const uzytkownik: PoleImportu = {
  klucz: 'uzytkownik',
  etykieta: 'Użytkownik',
  naglowki: ['uzytkownik', 'pracownik', 'osoba', 'przypisany do', 'przypisany', 'imie i nazwisko', 'wlasciciel'],
  format: 'imię i nazwisko albo e-mail pracownika z ewidencji',
};
const dataZakupu: PoleImportu = {
  klucz: 'dataZakupu',
  etykieta: 'Data zakupu',
  naglowki: ['data zakupu', 'zakup', 'kupiono', 'data kupna'],
  format: 'np. 15.03.2024',
};
const dataKoncaGwarancji: PoleImportu = {
  klucz: 'dataKoncaGwarancji',
  etykieta: 'Koniec gwarancji',
  naglowki: ['koniec gwarancji', 'data konca gwarancji', 'gwarancja do', 'gwarancja'],
  format: 'np. 15.03.2027',
};
const kosztBrutto: PoleImportu = {
  klucz: 'kosztBruttoGrosze',
  etykieta: 'Koszt brutto (zł)',
  naglowki: ['koszt brutto', 'koszt', 'cena brutto', 'cena', 'wartosc brutto', 'wartosc', 'kwota'],
  format: 'np. 5 999,00',
};

export const POLA_IMPORTU: Record<TypImportu, PoleImportu[]> = {
  PRACOWNIK: [
    { klucz: 'imie', etykieta: 'Imię', wymagane: true, naglowki: ['imie'] },
    { klucz: 'nazwisko', etykieta: 'Nazwisko', wymagane: true, naglowki: ['nazwisko'] },
    {
      klucz: 'imieNazwisko',
      etykieta: 'Imię i nazwisko (w jednej kolumnie)',
      zastepuje: ['imie', 'nazwisko'],
      naglowki: ['imie i nazwisko', 'pracownik', 'osoba'],
      format: 'np. Anna Maria Nowak — nazwisko to ostatni wyraz',
    },
    {
      klucz: 'nazwiskoImie',
      etykieta: 'Nazwisko i imię (w jednej kolumnie)',
      zastepuje: ['imie', 'nazwisko'],
      naglowki: ['nazwisko i imie'],
      format: 'np. Nowak Anna — nazwisko to pierwszy wyraz',
    },
    { klucz: 'stanowisko', etykieta: 'Stanowisko', wymagane: true, naglowki: ['stanowisko', 'funkcja', 'rola'] },
    {
      klucz: 'dzial',
      etykieta: 'Dział',
      wymagane: true,
      naglowki: ['dzial', 'departament', 'zespol', 'komorka'],
      format: 'nazwa działu — brakujące działy zostaną utworzone',
    },
    { klucz: 'email', etykieta: 'E-mail', naglowki: ['e-mail', 'email', 'mail', 'adres e-mail', 'adres email'] },
  ],
  KOMPUTER: [
    { ...numerEwidencyjny, naglowki: [...numerEwidencyjny.naglowki, 'nazwa komputera', 'hostname'] },
    numerSeryjny,
    {
      klucz: 'typ',
      etykieta: 'Typ',
      wymagane: true,
      naglowki: ['typ', 'rodzaj', 'typ komputera', 'rodzaj komputera'],
      format: 'laptop, stacjonarny, AiO albo serwer',
    },
    markaModel,
    { klucz: 'cpu', etykieta: 'CPU', wymagane: true, naglowki: ['cpu', 'procesor'] },
    {
      klucz: 'ramIloscGb',
      etykieta: 'RAM (GB)',
      wymagane: true,
      naglowki: ['ram', 'ram (gb)', 'ram gb', 'pamiec', 'pamiec ram', 'ilosc ram'],
      format: 'np. 16 albo „16 GB DDR4”',
    },
    {
      klucz: 'ramRodzaj',
      etykieta: 'Rodzaj RAM',
      naglowki: ['rodzaj ram', 'typ ram', 'typ pamieci', 'rodzaj pamieci'],
      format: 'DDR3/DDR4/DDR5 — bez kolumny: z kolumny RAM albo „inny”',
    },
    {
      klucz: 'pojemnoscDysku',
      etykieta: 'Dysk',
      wymagane: true,
      naglowki: ['dysk', 'dyski', 'pojemnosc dysku', 'pojemnosc', 'dysk twardy', 'ssd', 'hdd'],
    },
    {
      klucz: 'systemOperacyjny',
      etykieta: 'System operacyjny',
      naglowki: ['system operacyjny', 'system', 'os', 'windows'],
      format: 'np. Windows 11 Pro, Windows 10 Home, macOS, Linux',
    },
    { klucz: 'wersjaSystemu', etykieta: 'Wersja systemu', naglowki: ['wersja systemu', 'wersja', 'build'] },
    {
      klucz: 'macEthernet',
      etykieta: 'MAC (Ethernet)',
      naglowki: ['mac', 'mac ethernet', 'mac lan', 'mac (ethernet)', 'adres mac', 'mac eth'],
      format: 'dowolny zapis, np. 00-1A-2B-3C-4D-5E',
    },
    {
      klucz: 'macWifi',
      etykieta: 'MAC (WiFi)',
      naglowki: ['mac wifi', 'mac wi-fi', 'mac (wifi)', 'mac (wi-fi)', 'mac wlan', 'wifi mac'],
      format: 'dowolny zapis, np. 00-1A-2B-3C-4D-5E',
    },
    { klucz: 'notatki', etykieta: 'Notatki', naglowki: ['notatki', 'uwagi', 'opis', 'komentarz'] },
    dataZakupu,
    dataKoncaGwarancji,
    kosztBrutto,
    uzytkownik,
  ],
  MONITOR: [
    numerEwidencyjny,
    numerSeryjny,
    markaModel,
    {
      klucz: 'zlacza',
      etykieta: 'Złącza',
      wymagane: true,
      naglowki: ['zlacza', 'zlacze', 'porty', 'wejscia', 'interfejsy'],
      format: 'np. HDMI, DisplayPort',
    },
    {
      klucz: 'proporcjeEkranu',
      etykieta: 'Proporcje ekranu',
      wymagane: true,
      naglowki: ['proporcje ekranu', 'proporcje', 'format obrazu', 'format'],
      format: 'np. 16:9',
    },
    {
      klucz: 'wielkoscEkranu',
      etykieta: 'Wielkość ekranu (cale)',
      wymagane: true,
      naglowki: ['wielkosc ekranu', 'wielkosc', 'przekatna', 'rozmiar', 'cale', 'cali'],
      format: 'np. 24 albo 23,8',
    },
    uzytkownik,
  ],
  MYSZ: [numerEwidencyjny, numerSeryjny, markaModel, uzytkownik],
  KLAWIATURA: [numerEwidencyjny, numerSeryjny, markaModel, uzytkownik],
  TELEFON: [
    numerEwidencyjny,
    numerSeryjny,
    markaModel,
    {
      klucz: 'typ',
      etykieta: 'Typ',
      naglowki: ['typ', 'rodzaj'],
      format: 'smartfon albo kolektor — bez kolumny: smartfon',
    },
    { klucz: 'imei', etykieta: 'IMEI', wymagane: true, naglowki: ['imei', 'imei 1', 'imei1'] },
    {
      klucz: 'kodOdblokowania',
      etykieta: 'Kod odblokowania',
      naglowki: ['kod odblokowania', 'kod', 'kod kiosk', 'kiosk', 'pin telefonu'],
    },
    {
      klucz: 'numerTelefonu',
      etykieta: 'Numer telefonu (karta SIM)',
      naglowki: ['numer telefonu', 'nr telefonu', 'telefon', 'karta sim', 'sim', 'numer'],
      format: 'karta SIM musi już być w ewidencji',
    },
    dataZakupu,
    dataKoncaGwarancji,
    kosztBrutto,
    uzytkownik,
  ],
  KARTA_SIM: [
    { klucz: 'iccid', etykieta: 'ICCID', wymagane: true, naglowki: ['iccid', 'numer karty', 'nr karty', 'numer karty sim', 'nr karty sim'] },
    {
      klucz: 'numerTelefonu',
      etykieta: 'Numer telefonu',
      wymagane: true,
      naglowki: ['numer telefonu', 'nr telefonu', 'telefon', 'numer', 'msisdn'],
    },
    { klucz: 'pin1', etykieta: 'PIN 1', naglowki: ['pin', 'pin1', 'pin 1'] },
    { klucz: 'pin2', etykieta: 'PIN 2', naglowki: ['pin2', 'pin 2'] },
    { klucz: 'puk1', etykieta: 'PUK 1', naglowki: ['puk', 'puk1', 'puk 1'] },
    { klucz: 'puk2', etykieta: 'PUK 2', naglowki: ['puk2', 'puk 2'] },
    { klucz: 'taryfa', etykieta: 'Taryfa', wymagane: true, naglowki: ['taryfa', 'plan', 'pakiet', 'abonament'] },
    {
      klucz: 'kosztMiesiecznyGrosze',
      etykieta: 'Koszt miesięczny (zł)',
      wymagane: true,
      naglowki: ['koszt miesieczny', 'oplata miesieczna', 'koszt', 'oplata', 'cena', 'kwota'],
      format: 'np. 29,99',
    },
    {
      klucz: 'dataKoncaUmowy',
      etykieta: 'Koniec umowy',
      wymagane: true,
      naglowki: ['koniec umowy', 'data konca umowy', 'umowa do', 'umowa'],
      format: 'np. 31.12.2026',
    },
    uzytkownik,
  ],
  DRUKARKA: [
    numerEwidencyjny,
    numerSeryjny,
    markaModel,
    {
      klucz: 'dzialPietroMiejsce',
      etykieta: 'Dział/piętro/miejsce',
      wymagane: true,
      naglowki: ['dzial/pietro/miejsce', 'lokalizacja', 'miejsce', 'pietro', 'gdzie', 'dzial'],
    },
    { klucz: 'adresIP', etykieta: 'Adres IP', naglowki: ['adres ip', 'ip'] },
    { klucz: 'mac', etykieta: 'MAC', naglowki: ['mac', 'adres mac'], format: 'dowolny zapis, np. 00-1A-2B-3C-4D-5E' },
    dataZakupu,
    dataKoncaGwarancji,
    kosztBrutto,
  ],
};

export const MAX_WIERSZY_IMPORTU = 2000;

export const importSchema = z.object({
  typ: z.enum(TYPY_IMPORTU),
  wiersze: z
    .array(
      z.object({
        /** Numer wiersza w arkuszu — żeby błąd dało się znaleźć w Excelu. */
        nr: z.number().int().positive(),
        dane: z.record(z.string().max(64), z.string().max(4000)),
      }),
    )
    .min(1, 'Brak wierszy do importu')
    .max(MAX_WIERSZY_IMPORTU, `Najwyżej ${MAX_WIERSZY_IMPORTU} wierszy naraz — podziel arkusz`),
  /** false = tylko sprawdź (podgląd), true = zapisz poprawne wiersze. */
  zapisz: z.boolean().default(false),
});
export type ImportInput = z.infer<typeof importSchema>;

export interface UwagaImportu {
  /** Pole, którego dotyczy uwaga (null = cały wiersz). */
  pole: string | null;
  komunikat: string;
}

export type WartoscImportu = string | number | boolean | null;

export interface WierszImportu {
  nr: number;
  /** Wartości po interpretacji (np. typ „LAPTOP”, koszt w groszach, data RRRR-MM-DD, użytkownik „Jan Nowak (IT)”). */
  wartosci: Record<string, WartoscImportu>;
  bledy: UwagaImportu[];
  ostrzezenia: UwagaImportu[];
}

export interface WynikImportu {
  wiersze: WierszImportu[];
  poprawne: number;
  zBledami: number;
  /** Działy, które import pracowników utworzy (albo utworzył). */
  noweDzialy: string[];
  /** Tylko po zapisie. */
  zapisano?: { liczba: number; kopia: string | null; bladKopii: string | null };
}

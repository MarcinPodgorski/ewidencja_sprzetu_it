/**
 * Wartości "enumeracyjne" używane w całym systemie.
 *
 * Uwaga: Prisma z providerem SQLite nie wspiera natywnego typu `enum` w schema.prisma
 * (ograniczenie connectora, nie Prisma jako takiego). Kolumny odpowiadające tym
 * wartościom są w bazie zwykłym `String`, a poprawność wartości jest wymuszana
 * w warstwie aplikacji przez schematy Zod zdefiniowane poniżej — to jedno źródło
 * prawdy współdzielone przez backend (walidacja request body) i frontend (formularze).
 */

export const COMPUTER_TYPES = ['STACJONARNY', 'LAPTOP', 'AIO', 'SERWER'] as const;
export type ComputerType = (typeof COMPUTER_TYPES)[number];

export const RAM_TYPES = ['DDR3', 'DDR4', 'DDR5', 'INNY'] as const;
export type RamType = (typeof RAM_TYPES)[number];

export const PHONE_TYPES = ['SMARTFON', 'KOLEKTOR'] as const;
export type PhoneType = (typeof PHONE_TYPES)[number];

export const APP_USER_ROLES = ['ADMIN', 'USER'] as const;
export type AppUserRole = (typeof APP_USER_ROLES)[number];

export const PERMISSION_LEVELS = ['VIEW', 'EDIT'] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/**
 * Typ sprzętu — dyskryminator używany w tabelach generycznych: historii przypisań
 * (AssignmentHistory) i pozycji spisów (EquipmentListItem). Karty SIM mają historię
 * przypisań tak samo jak pozostałe typy; drukarki nie mają "użytkownika" — ich wpisy
 * historii śledzą zmianę lokalizacji (pole `lokalizacja`, `uzytkownikId` = null).
 */
export const EQUIPMENT_TYPES = [
  'KOMPUTER',
  'MONITOR',
  'MYSZ',
  'KLAWIATURA',
  'TELEFON',
  'DRUKARKA',
  'KARTA_SIM',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

/** Etykiety PL do wyświetlania w UI. */
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  KOMPUTER: 'Komputer',
  MONITOR: 'Monitor',
  MYSZ: 'Mysz',
  KLAWIATURA: 'Klawiatura',
  TELEFON: 'Telefon',
  DRUKARKA: 'Drukarka',
  KARTA_SIM: 'Karta SIM',
};

export const COMPUTER_TYPE_LABELS: Record<ComputerType, string> = {
  STACJONARNY: 'Komputer stacjonarny',
  LAPTOP: 'Laptop',
  AIO: 'All-in-One',
  SERWER: 'Serwer',
};

export const PHONE_TYPE_LABELS: Record<PhoneType, string> = {
  SMARTFON: 'Smartfon',
  KOLEKTOR: 'Kolektor magazynowy',
};

/** Typy sprzętu, dla których dostępny jest endpoint /:id/history (mają historię przypisań). */
export const HISTORY_ENABLED_TYPES = EQUIPMENT_TYPES;

/** Mapowanie typu sprzętu -> segment ścieżki API (liczba mnoga, kebab/plural REST). */
export const EQUIPMENT_API_SEGMENT: Record<EquipmentType, string> = {
  KOMPUTER: 'computers',
  MONITOR: 'monitors',
  MYSZ: 'mice',
  KLAWIATURA: 'keyboards',
  TELEFON: 'phones',
  DRUKARKA: 'printers',
  KARTA_SIM: 'sim-cards',
};

/**
 * Tryb skryptu onboardingu — zależy od edycji Windowsa na laptopie:
 * - HOME: brak dołączenia do Entra ID → skrypt zakłada lokalne konto pracownika,
 *   a logowanie do Microsoft 365 jest półautomatyczne (przypomnienie przy 1. logowaniu).
 * - PRO: laptop dołączony do Entra ID w kreatorze → pracownik loguje się do Windowsa
 *   kontem M365 (SSO), skrypt nie zakłada konta lokalnego.
 */
export const ONBOARDING_TRYBY = ['HOME', 'PRO'] as const;
export type OnboardingTryb = (typeof ONBOARDING_TRYBY)[number];

export const ONBOARDING_TRYB_LABELS: Record<OnboardingTryb, string> = {
  HOME: 'Windows 11 Home',
  PRO: 'Windows 11 Pro',
};

/** Źródło programu w katalogu onboardingu: pakiet winget albo wgrany plik instalacyjny. */
export const OPROGRAMOWANIE_ZRODLA = ['WINGET', 'PLIK'] as const;
export type OprogramowanieZrodlo = (typeof OPROGRAMOWANIE_ZRODLA)[number];

export const OPROGRAMOWANIE_ZRODLO_LABELS: Record<OprogramowanieZrodlo, string> = {
  WINGET: 'winget',
  PLIK: 'plik instalacyjny',
};

/** Rozszerzenia instalatorów obsługiwanych przez skrypt (sposób uruchomienia zależy od typu). */
export const INSTALATOR_ROZSZERZENIA = ['.msi', '.exe', '.bat', '.cmd', '.ps1'] as const;

/** System operacyjny komputera — edycja Windowsa ma znaczenie (np. dla trybu onboardingu). */
export const SYSTEMY_OPERACYJNE = [
  'WINDOWS_11_PRO',
  'WINDOWS_11_HOME',
  'WINDOWS_10_PRO',
  'WINDOWS_10_HOME',
  'WINDOWS_SERVER',
  'MACOS',
  'LINUX',
  'CHROMEOS',
  'INNY',
] as const;
export type SystemOperacyjny = (typeof SYSTEMY_OPERACYJNE)[number];

export const SYSTEM_OPERACYJNY_LABELS: Record<SystemOperacyjny, string> = {
  WINDOWS_11_PRO: 'Windows 11 Pro',
  WINDOWS_11_HOME: 'Windows 11 Home',
  WINDOWS_10_PRO: 'Windows 10 Pro',
  WINDOWS_10_HOME: 'Windows 10 Home',
  WINDOWS_SERVER: 'Windows Server',
  MACOS: 'macOS',
  LINUX: 'Linux',
  CHROMEOS: 'ChromeOS',
  INNY: 'Inny',
};

export type RodzinaSystemu = 'WINDOWS' | 'MACOS' | 'LINUX' | 'CHROMEOS' | 'INNY';

/** Rodzina systemu — np. do wyboru ikony (wszystkie Windowsy mają to samo logo). */
export function rodzinaSystemu(system: SystemOperacyjny): RodzinaSystemu {
  if (system.startsWith('WINDOWS')) return 'WINDOWS';
  if (system === 'MACOS' || system === 'LINUX' || system === 'CHROMEOS') return system;
  return 'INNY';
}

/** Edycja Windowsa dla trybu skryptu onboardingu, albo null dla pozostałych systemów. */
export function edycjaWindowsa(system: SystemOperacyjny | null | undefined): 'HOME' | 'PRO' | null {
  if (system === 'WINDOWS_11_HOME' || system === 'WINDOWS_10_HOME') return 'HOME';
  if (system === 'WINDOWS_11_PRO' || system === 'WINDOWS_10_PRO') return 'PRO';
  return null;
}

/**
 * Odczyt sprzętu — dane wysłane z komputera przez skrypt (`irm …/odczyt/<kod> | iex`),
 * przez skrypt onboardingu albo wgrane jako plik JSON. Nic nie trafia do ewidencji
 * automatycznie: admin przegląda odczyt i wybiera pola do przepisania.
 */
export const STATUSY_ODCZYTU = ['NOWY', 'ZASTOSOWANY', 'ODRZUCONY'] as const;
export type StatusOdczytu = (typeof STATUSY_ODCZYTU)[number];

export const STATUS_ODCZYTU_LABELS: Record<StatusOdczytu, string> = {
  NOWY: 'Do przejrzenia',
  ZASTOSOWANY: 'Zastosowany',
  ODRZUCONY: 'Odrzucony',
};

export const ZRODLA_ODCZYTU = ['SKRYPT', 'ONBOARDING', 'PLIK'] as const;
export type ZrodloOdczytu = (typeof ZRODLA_ODCZYTU)[number];

export const ZRODLO_ODCZYTU_LABELS: Record<ZrodloOdczytu, string> = {
  SKRYPT: 'skrypt odczytu',
  ONBOARDING: 'skrypt onboardingu',
  PLIK: 'wgrany plik',
};

/** Jak odczyt został powiązany z komputerem w ewidencji. */
export const DOPASOWANIA_ODCZYTU = ['KOD', 'ONBOARDING', 'NUMER_SERYJNY', 'NAZWA', 'MAC', 'RECZNIE', 'UTWORZONY'] as const;
export type DopasowanieOdczytu = (typeof DOPASOWANIA_ODCZYTU)[number];

export const DOPASOWANIE_ODCZYTU_LABELS: Record<DopasowanieOdczytu, string> = {
  KOD: 'kod przypięty do komputera',
  ONBOARDING: 'skrypt onboardingu tego komputera',
  NUMER_SERYJNY: 'numer seryjny',
  NAZWA: 'nazwa komputera = numer ewidencyjny',
  MAC: 'adres MAC',
  RECZNIE: 'wskazany ręcznie',
  UTWORZONY: 'komputer utworzony z tego odczytu',
};

/** Pola komputera, które odczyt potrafi zaproponować (w kolejności wyświetlania). */
export const POLA_ODCZYTU = [
  'markaModel',
  'numerSeryjny',
  'typ',
  'cpu',
  'ramIloscGb',
  'ramRodzaj',
  'pojemnoscDysku',
  'systemOperacyjny',
  'wersjaSystemu',
  'macEthernet',
  'macWifi',
] as const;
export type PoleOdczytu = (typeof POLA_ODCZYTU)[number];

export const POLE_ODCZYTU_LABELS: Record<PoleOdczytu, string> = {
  markaModel: 'Marka/model',
  numerSeryjny: 'Numer seryjny',
  typ: 'Typ',
  cpu: 'CPU',
  ramIloscGb: 'RAM (GB)',
  ramRodzaj: 'Rodzaj RAM',
  pojemnoscDysku: 'Dyski',
  systemOperacyjny: 'System operacyjny',
  wersjaSystemu: 'Wersja systemu',
  macEthernet: 'MAC (Ethernet)',
  macWifi: 'MAC (WiFi)',
};

/** Typy pamięci SMBIOS (Win32_PhysicalMemory.SMBIOSMemoryType) → rodzaj RAM w ewidencji.
 *  LPDDR to energooszczędny wariant tej samej generacji — w ewidencji liczy się generacja. */
export const TYPY_PAMIECI_SMBIOS: Record<number, { etykieta: string; rodzaj: RamType }> = {
  18: { etykieta: 'DDR', rodzaj: 'INNY' },
  19: { etykieta: 'DDR2', rodzaj: 'INNY' },
  24: { etykieta: 'DDR3', rodzaj: 'DDR3' },
  26: { etykieta: 'DDR4', rodzaj: 'DDR4' },
  27: { etykieta: 'LPDDR', rodzaj: 'INNY' },
  28: { etykieta: 'LPDDR2', rodzaj: 'INNY' },
  29: { etykieta: 'LPDDR3', rodzaj: 'DDR3' },
  30: { etykieta: 'LPDDR4', rodzaj: 'DDR4' },
  34: { etykieta: 'DDR5', rodzaj: 'DDR5' },
  35: { etykieta: 'LPDDR5', rodzaj: 'DDR5' },
};

/** Rozmiar dysku tak, jak podaje go producent (GB/TB dziesiętne): 512110190592 → „512GB”. */
export function rozmiarDysku(bajty: number): string {
  const gb = bajty / 1e9;
  if (gb >= 1000) {
    const tb = Math.round(gb / 100) / 10;
    return `${String(tb).replace('.', ',')}TB`;
  }
  return `${Math.round(gb)}GB`;
}

/** Typy sprzętu z numerem ewidencyjnym — mogą mieć naklejkę z kodem QR i trafić do spisu
 *  z natury (karta SIM siedzi w telefonie i ma tylko ICCID). */
export const TYPY_Z_ETYKIETA = ['KOMPUTER', 'MONITOR', 'MYSZ', 'KLAWIATURA', 'TELEFON', 'DRUKARKA'] as const;
export type TypZEtykieta = (typeof TYPY_Z_ETYKIETA)[number];

/** Formaty naklejek: popularne arkusze A4 i drukarka etykiet (jedna etykieta na stronie). */
export const SZABLONY_ETYKIET = ['A4_70x37', 'A4_105x42', 'A4_48x25', 'ROLKA_62x29'] as const;
export type SzablonEtykiet = (typeof SZABLONY_ETYKIET)[number];

export interface WymiaryEtykiet {
  nazwa: string;
  /** false = drukarka etykiet: strona ma rozmiar etykiety. */
  arkuszA4: boolean;
  kolumny: number;
  wiersze: number;
  /** Wymiary w milimetrach. */
  szerokosc: number;
  wysokosc: number;
  marginesLewy: number;
  marginesGorny: number;
}

export const SZABLON_ETYKIET_INFO: Record<SzablonEtykiet, WymiaryEtykiet> = {
  A4_70x37: { nazwa: 'Arkusz A4 — 70 × 37 mm (24 szt.)', arkuszA4: true, kolumny: 3, wiersze: 8, szerokosc: 70, wysokosc: 37, marginesLewy: 0, marginesGorny: 0.5 },
  A4_105x42: { nazwa: 'Arkusz A4 — 105 × 42,3 mm (14 szt.)', arkuszA4: true, kolumny: 2, wiersze: 7, szerokosc: 105, wysokosc: 42.3, marginesLewy: 0, marginesGorny: 0.45 },
  A4_48x25: { nazwa: 'Arkusz A4 — 48,5 × 25,4 mm (44 szt.)', arkuszA4: true, kolumny: 4, wiersze: 11, szerokosc: 48.5, wysokosc: 25.4, marginesLewy: 8, marginesGorny: 8.8 },
  ROLKA_62x29: { nazwa: 'Drukarka etykiet — 62 × 29 mm', arkuszA4: false, kolumny: 1, wiersze: 1, szerokosc: 62, wysokosc: 29, marginesLewy: 0, marginesGorny: 0 },
};

/** Spis z natury (inwentaryzacja): otwarta = trwa potwierdzanie obecności sprzętu. */
export const STATUSY_INWENTARYZACJI = ['OTWARTA', 'ZAMKNIETA'] as const;
export type StatusInwentaryzacji = (typeof STATUSY_INWENTARYZACJI)[number];

export const STATUS_INWENTARYZACJI_LABELS: Record<StatusInwentaryzacji, string> = {
  OTWARTA: 'w toku',
  ZAMKNIETA: 'zamknięta',
};

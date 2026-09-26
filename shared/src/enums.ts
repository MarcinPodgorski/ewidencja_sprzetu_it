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

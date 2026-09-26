import type { AppUserRole, ComputerType, OnboardingTryb, OprogramowanieZrodlo, PhoneType, RamType } from 'shared';

export interface Department {
  id: number;
  nazwa: string;
  createdAt: string;
}

export interface Employee {
  id: number;
  imie: string;
  nazwisko: string;
  stanowisko: string;
  /** Służbowy e-mail = login do Microsoft 365. */
  email?: string | null;
  dzialId: number;
  aktywny: boolean;
  dzial?: Department;
}

export interface AppUser {
  id: number;
  imie: string;
  nazwisko: string;
  login: string;
  rola: AppUserRole;
  aktywny: boolean;
  createdAt: string;
}

/** Informacje zakupowe współdzielone przez komputery, telefony i drukarki. Powiązanie
 *  z fakturą (numer, KSeF, kwota, załączniki) żyje osobno w module Faktury — patrz
 *  features/faktury — bo jedna faktura może obejmować wiele sztuk sprzętu naraz. */
interface PurchaseInfo {
  dataZakupu: string | null;
  dataKoncaGwarancji: string | null;
  kosztBruttoGrosze: number | null;
}

interface EquipmentBase {
  id: number;
  numerEwidencyjny: string;
  numerSeryjny: string;
  markaModel: string;
  wycofany: boolean;
  dataWycofania: string | null;
  aktualnyUzytkownikId: number | null;
  aktualnyUzytkownik?: Employee | null;
}

export interface Computer extends EquipmentBase, PurchaseInfo {
  typ: ComputerType;
  cpu: string;
  ramIloscGb: number;
  ramRodzaj: RamType;
  pojemnoscDysku: string;
  macEthernet: string | null;
  macWifi: string | null;
  notatki: string | null;
}

export interface Monitor extends EquipmentBase {
  zlacza: string;
  proporcjeEkranu: string;
  wielkoscEkranu: number;
}

export interface Mouse extends EquipmentBase {
  czyZestaw: boolean;
  pair?: { keyboard: Keyboard } | null;
}

export interface Keyboard extends EquipmentBase {
  czyZestaw: boolean;
  pair?: { mouse: Mouse } | null;
}

export interface Phone extends EquipmentBase, PurchaseInfo {
  typ: PhoneType;
  imei: string;
  kodOdblokowania: string | null;
  simCardId: number | null;
}

export interface SimCard {
  id: number;
  iccid: string;
  numerTelefonu: string;
  pin1: string | null;
  pin2: string | null;
  puk1: string | null;
  puk2: string | null;
  taryfa: string;
  kosztMiesiecznyGrosze: number;
  dataKoncaUmowy: string;
  wycofany: boolean;
  dataWycofania: string | null;
  aktualnyUzytkownikId: number | null;
  aktualnyUzytkownik?: Employee | null;
}

export interface Toner {
  id: number;
  oznaczenie: string;
  ilosc: number;
  drukarki?: { printer: Printer }[];
}

export interface Printer extends PurchaseInfo {
  id: number;
  numerEwidencyjny: string;
  numerSeryjny: string;
  markaModel: string;
  dzialPietroMiejsce: string;
  adresIP: string | null;
  mac: string | null;
  wycofany: boolean;
  dataWycofania: string | null;
  tonery?: { toner: Toner }[];
}

export interface EquipmentSummary {
  sprzetTyp: string;
  sprzetId: number;
  identyfikator: string;
  opis: string | null;
  numerSeryjny: string | null;
  wycofany: boolean;
  aktualnyUzytkownik: { id: number; imie: string; nazwisko: string } | null;
}

export interface EquipmentListItem {
  id: number;
  listId: number;
  sprzetTyp: string;
  sprzetId: number;
  dodanoAt: string;
  sprzet: EquipmentSummary | null;
}

export interface EquipmentListPermission {
  id: number;
  listId: number;
  appUserId: number;
  poziom: 'VIEW' | 'EDIT';
  nadanoAt: string;
  appUser?: { id: number; imie: string; nazwisko: string; login: string };
}

export interface EquipmentList {
  id: number;
  nazwa: string;
  dzialId: number;
  opis: string | null;
  createdAt: string;
  dzial?: Department;
  _count?: { items: number };
  permissions?: EquipmentListPermission[];
  items?: EquipmentListItem[];
}

/** Pozycja zagregowanego sprzętu pracownika (GET /employees/:id/equipment). */
export interface EmployeeEquipmentItem {
  sprzetTyp: string;
  id: number;
  numerEwidencyjny?: string;
  iccid?: string;
  numerSeryjny?: string | null;
  markaModel?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Onboarding komputerów
// ---------------------------------------------------------------------------

export interface Oprogramowanie {
  id: number;
  nazwa: string;
  zrodlo: OprogramowanieZrodlo;
  wingetId: string | null;
  /** Tylko zrodlo = PLIK: oryginalna nazwa, rozmiar i suma wgranego instalatora. */
  plikNazwa: string | null;
  plikRozmiar: number | null;
  plikSha256: string | null;
  maPlik: boolean;
  argumenty: string | null;
  opis: string | null;
}

export interface ProfilOprogramowania {
  id: number;
  nazwa: string;
  opis: string | null;
  dzialId: number | null;
  dzial?: Department | null;
  oprogramowanie: Oprogramowanie[];
}

export interface UstawieniaOnboardingu {
  komunikatTytul: string;
  komunikatTresc: string;
}

/** Migawka opcji zapisana przy generowaniu skryptu (patrz scriptGenerator.ts na serwerze). */
export interface KonfiguracjaOnboardingu {
  nazwaKomputera: string;
  imieNazwisko: string;
  loginLokalny: string | null;
  emailM365: string | null;
  komunikat: { tytul: string; tresc: string } | null;
  programy: (
    | { typ: 'WINGET'; nazwa: string; wingetId: string }
    | {
        typ: 'PLIK';
        nazwa: string;
        oprogramowanieId: number;
        plikNazwa: string;
        plikRozmiar: number;
        plikSha256: string;
        argumenty: string | null;
      }
  )[];
  m365Apps: boolean;
}

export interface OnboardingSesja {
  id: number;
  token: string;
  computerId: number;
  employeeId: number;
  tryb: OnboardingTryb;
  konfiguracja: KonfiguracjaOnboardingu;
  wygasaAt: string;
  wygasla: boolean;
  pobranoAt: string | null;
  createdAt: string;
  computer: { id: number; numerEwidencyjny: string };
  employee: { id: number; imie: string; nazwisko: string; email: string | null };
  utworzylAppUser: { id: number; login: string } | null;
}

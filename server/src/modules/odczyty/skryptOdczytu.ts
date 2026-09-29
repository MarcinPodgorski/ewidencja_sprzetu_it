import fs from 'fs';
import path from 'path';
import { podstaw, psQuote } from '../../utils/powershell';

/** Szablony jak przy onboardingu: zwykłe pliki .ps1, bez escapowania PowerShella w stringach JS. */
const KATALOG_SZABLONOW = path.resolve(__dirname, '../../../assets/odczyt');
const SZABLON_SKRYPTU = path.join(KATALOG_SZABLONOW, 'odczyt.ps1');
const SZABLON_INSTALATORA = path.join(KATALOG_SZABLONOW, 'instaluj.ps1');
const SZABLON_AGENTA = path.join(KATALOG_SZABLONOW, 'agent.ps1');
const SZABLON_FUNKCJI = path.join(KATALOG_SZABLONOW, 'funkcje.ps1');

export const ZNACZNIK_KONFIGURACJI = '#@KONFIGURACJA@#';
export const ZNACZNIK_FUNKCJI = '#@FUNKCJE_ODCZYTU@#';

/** Funkcje Get-DaneSprzetu/Send-DaneSprzetu — wklejane też do skryptu onboardingu. */
export function funkcjeOdczytu(): string {
  return fs.readFileSync(SZABLON_FUNKCJI, 'utf8').replace(/\s+$/, '');
}

const WCIECIE = '    ';

/** Szablon + blok konfiguracji + funkcje odczytu → gotowy skrypt (CRLF, bez BOM). */
function zbuduj(plik: string, wygenerowano: Date, zmienne: [string, string | null][]): string {
  const konfiguracja = [
    `${WCIECIE}# ----- Konfiguracja wygenerowana przez aplikację (${wygenerowano.toISOString().slice(0, 16).replace('T', ' ')} UTC) -----`,
    ...zmienne.map(([nazwa, wartosc]) => `${WCIECIE}$${nazwa.padEnd(18)} = ${wartosc === null ? '$null' : psQuote(wartosc)}`),
  ].join('\n');
  let skrypt = fs.readFileSync(plik, 'utf8');
  skrypt = podstaw(skrypt, ZNACZNIK_KONFIGURACJI, konfiguracja, plik);
  skrypt = podstaw(skrypt, ZNACZNIK_FUNKCJI, funkcjeOdczytu(), plik);
  return skrypt.replace(/\r?\n/g, '\r\n');
}

export interface OpcjeSkryptuOdczytu {
  kod: string;
  /** Bazowy adres API widziany z komputera, np. http://192.168.1.10/sprzet/api. */
  adresSerwera: string;
  /** Numer ewidencyjny, gdy kod jest przypięty do konkretnego komputera. */
  komputer: string | null;
  wygenerowano: Date;
}

/** Jednorazowy odczyt (`irm …/odczyt/<kod> | iex`). */
export function generujSkryptOdczytu(opcje: OpcjeSkryptuOdczytu): string {
  return zbuduj(SZABLON_SKRYPTU, opcje.wygenerowano, [
    ['AdresSerwera', opcje.adresSerwera],
    ['KodOdczytu', opcje.kod],
    ['KomputerWEwidencji', opcje.komputer],
  ]);
}

export interface OpcjeOdczytuCyklicznego {
  token: string;
  adresSerwera: string;
  wygenerowano: Date;
}

/** Instalator odczytu cyklicznego (`irm …/odczyt/<kod>/instaluj | iex`, jako administrator). */
export function generujInstalatorOdczytu(opcje: OpcjeOdczytuCyklicznego & { komputer: string | null }): string {
  return zbuduj(SZABLON_INSTALATORA, opcje.wygenerowano, [
    ['AdresSerwera', opcje.adresSerwera],
    ['TokenAgenta', opcje.token],
    ['KomputerWEwidencji', opcje.komputer],
  ]);
}

/** Skrypt zadania w Harmonogramie zadań (pobierany przez instalator). */
export function generujAgentaOdczytu(opcje: OpcjeOdczytuCyklicznego): string {
  return zbuduj(SZABLON_AGENTA, opcje.wygenerowano, [
    ['AdresSerwera', opcje.adresSerwera],
    ['TokenAgenta', opcje.token],
  ]);
}

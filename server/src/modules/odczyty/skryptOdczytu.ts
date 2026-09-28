import fs from 'fs';
import path from 'path';
import { podstaw, psQuote } from '../../utils/powershell';

/** Szablony jak przy onboardingu: zwykłe pliki .ps1, bez escapowania PowerShella w stringach JS. */
const KATALOG_SZABLONOW = path.resolve(__dirname, '../../../assets/odczyt');
const SZABLON_SKRYPTU = path.join(KATALOG_SZABLONOW, 'odczyt.ps1');
const SZABLON_FUNKCJI = path.join(KATALOG_SZABLONOW, 'funkcje.ps1');

export const ZNACZNIK_KONFIGURACJI = '#@KONFIGURACJA@#';
export const ZNACZNIK_FUNKCJI = '#@FUNKCJE_ODCZYTU@#';

/** Funkcje Get-DaneSprzetu/Send-DaneSprzetu — wklejane też do skryptu onboardingu. */
export function funkcjeOdczytu(): string {
  return fs.readFileSync(SZABLON_FUNKCJI, 'utf8').replace(/\s+$/, '');
}

export interface OpcjeSkryptuOdczytu {
  kod: string;
  /** Bazowy adres API widziany z komputera, np. http://192.168.1.10/sprzet/api. */
  adresSerwera: string;
  /** Numer ewidencyjny, gdy kod jest przypięty do konkretnego komputera. */
  komputer: string | null;
  wygenerowano: Date;
}

/** Kompletny skrypt odczytu (CRLF, bez BOM — BOM dokłada tylko pobieranie jako plik). */
export function generujSkryptOdczytu(opcje: OpcjeSkryptuOdczytu): string {
  const wciecie = '    ';
  const konfiguracja = [
    `${wciecie}# ----- Konfiguracja wygenerowana przez aplikację (${opcje.wygenerowano.toISOString().slice(0, 16).replace('T', ' ')} UTC) -----`,
    `${wciecie}$AdresSerwera       = ${psQuote(opcje.adresSerwera)}`,
    `${wciecie}$KodOdczytu         = ${psQuote(opcje.kod)}`,
    `${wciecie}$KomputerWEwidencji = ${opcje.komputer === null ? '$null' : psQuote(opcje.komputer)}`,
  ].join('\n');

  let skrypt = fs.readFileSync(SZABLON_SKRYPTU, 'utf8');
  skrypt = podstaw(skrypt, ZNACZNIK_KONFIGURACJI, konfiguracja, SZABLON_SKRYPTU);
  skrypt = podstaw(skrypt, ZNACZNIK_FUNKCJI, funkcjeOdczytu(), SZABLON_SKRYPTU);
  return skrypt.replace(/\r?\n/g, '\r\n');
}

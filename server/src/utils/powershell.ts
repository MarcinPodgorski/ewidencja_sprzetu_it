/** Wspólne narzędzia generatorów skryptów PowerShell (onboarding, odczyt sprzętu). */

/**
 * Literał PowerShella w pojedynczych cudzysłowach — jedyne miejsce, przez które dane
 * z aplikacji trafiają do skryptu. W takim literale nic nie jest interpolowane, a jedyny
 * znak specjalny to apostrof (ucieczka przez podwojenie). Uwaga: PowerShell uznaje za
 * apostrof także typograficzne ‘ ’ ‚ ‛ — je też trzeba podwoić, inaczej np. „O’Connor”
 * albo tekst wklejony z Worda zakończyłby literał i reszta stałaby się kodem.
 */
export function psQuote(value: string): string {
  const normalized = value.replace(/\0/g, '').replace(/\r?\n/g, '\r\n');
  return `'${normalized.replace(/['‘’‚‛]/g, (q) => q + q)}'`;
}

/** Wstawia treść w miejsce znacznika szablonu — funkcją, bo w stringu zamiennika `$&`,
 *  `$'` itp. mają w String.replace specjalne znaczenie, a w PowerShellu `$` jest wszędzie. */
export function podstaw(szablon: string, znacznik: string, tresc: string, plik: string): string {
  if (!szablon.includes(znacznik)) throw new Error(`Szablon ${plik} nie zawiera znacznika ${znacznik}`);
  return szablon.replace(znacznik, () => tresc);
}

/** Minimalny „skrypt” zwracany dla nieważnego/wygasłego kodu — `irm … | iex` pokaże komunikat. */
export function skryptBledu(komunikat: string): string {
  return `Write-Host ${psQuote(komunikat)} -ForegroundColor Red\r\n`;
}

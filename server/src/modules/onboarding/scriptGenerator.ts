import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { ONBOARDING_TRYB_LABELS, type OnboardingTryb } from 'shared';

/** Szablon trzymany jako zwykły plik .ps1 (jak fonty PDF w server/assets) — dzięki temu
 *  kod PowerShella nie wymaga escapowania backticków i `$` w stringach JS. */
const TEMPLATE_PATH = path.resolve(__dirname, '../../../assets/onboarding/onboarding.ps1');
const PLACEHOLDER = '#@KONFIGURACJA@#';

const programWingetSchema = z.object({ typ: z.literal('WINGET'), nazwa: z.string(), wingetId: z.string() });
const programPlikSchema = z.object({
  typ: z.literal('PLIK'),
  nazwa: z.string(),
  oprogramowanieId: z.number().int(),
  plikNazwa: z.string(),
  plikRozmiar: z.number().int(),
  plikSha256: z.string(),
  argumenty: z.string().nullable(),
});
/** Migawki sprzed wprowadzenia instalatorów z plików nie mają pola `typ` — to zawsze winget. */
const programSchema = z.preprocess(
  (v) => (v && typeof v === 'object' && !('typ' in v) ? { ...v, typ: 'WINGET' } : v),
  z.discriminatedUnion('typ', [programWingetSchema, programPlikSchema]),
);
export type ProgramOnboardingu = z.infer<typeof programSchema>;

/** Migawka opcji zapisywana w OnboardingSesja.konfiguracja (JSON). */
export const konfiguracjaOnboardinguSchema = z.object({
  nazwaKomputera: z.string(),
  imieNazwisko: z.string(),
  loginLokalny: z.string().nullable(),
  emailM365: z.string().nullable(),
  komunikat: z.object({ tytul: z.string(), tresc: z.string() }).nullable(),
  programy: z.array(programSchema),
  m365Apps: z.boolean(),
});
export type KonfiguracjaOnboardingu = z.infer<typeof konfiguracjaOnboardinguSchema>;

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

function psValue(value: string | null): string {
  return value === null ? '$null' : psQuote(value);
}

/** Tekst okienka przypominającego o połączeniu z Microsoft 365 (tryb Home). */
export function komunikatPolaczeniaM365(email: string): string {
  return [
    'Połącz ten komputer ze swoim kontem Microsoft 365.',
    '',
    'W oknie, które się teraz otworzy, kliknij „Połącz” i zaloguj się jako:',
    email,
    '',
    'Potem Word, Outlook, Teams i OneDrive będą korzystać z tego konta bez ponownego logowania.',
  ].join('\n');
}

function literalProgramu(p: ProgramOnboardingu): string {
  if (p.typ === 'WINGET') {
    return `@{ Typ = 'WINGET'; Nazwa = ${psQuote(p.nazwa)}; WingetId = ${psQuote(p.wingetId)} }`;
  }
  return (
    `@{ Typ = 'PLIK'; Nazwa = ${psQuote(p.nazwa)}; Id = ${p.oprogramowanieId}; Plik = ${psQuote(p.plikNazwa)}; ` +
    `Rozmiar = ${p.plikRozmiar}; Sha256 = ${psQuote(p.plikSha256)}; Argumenty = ${psValue(p.argumenty)} }`
  );
}

export interface OpcjeSkryptu {
  wygenerowano: Date;
  /** Kod sesji — skrypt pobiera nim instalatory z serwera (`/start/<kod>/pliki/<id>`). */
  kod: string;
  /** Bazowy adres API widziany z laptopa, np. http://192.168.1.10/sprzet/api. */
  adresSerwera: string;
}

function blokKonfiguracji(tryb: OnboardingTryb, k: KonfiguracjaOnboardingu, opcje: OpcjeSkryptu): string {
  const wciecie = '    ';
  const programy =
    k.programy.length === 0
      ? `${wciecie}$Programy = @()`
      : [
          `${wciecie}$Programy = @(`,
          ...k.programy.map((p) => `${wciecie}    ${literalProgramu(p)}`),
          `${wciecie})`,
        ].join('\n');

  const komunikatM365 = tryb === 'HOME' && k.emailM365 ? komunikatPolaczeniaM365(k.emailM365) : null;

  return [
    `${wciecie}# ----- Konfiguracja wygenerowana przez aplikację (${opcje.wygenerowano.toISOString().slice(0, 16).replace('T', ' ')} UTC) -----`,
    `${wciecie}$NazwaKomputera   = ${psQuote(k.nazwaKomputera)}`,
    `${wciecie}$Tryb             = ${psQuote(tryb)}`,
    `${wciecie}$TrybOpis         = ${psQuote(ONBOARDING_TRYB_LABELS[tryb])}`,
    `${wciecie}$ImieNazwisko     = ${psQuote(k.imieNazwisko)}`,
    `${wciecie}$LoginLokalny     = ${psValue(tryb === 'HOME' ? k.loginLokalny : null)}`,
    `${wciecie}$EmailM365        = ${psValue(k.emailM365)}`,
    `${wciecie}$KomunikatTytul   = ${psValue(k.komunikat ? k.komunikat.tytul : null)}`,
    `${wciecie}$KomunikatTresc   = ${psValue(k.komunikat ? k.komunikat.tresc : null)}`,
    `${wciecie}$KomunikatM365    = ${psValue(komunikatM365)}`,
    `${wciecie}$InstalujM365Apps = ${k.m365Apps ? '$true' : '$false'}`,
    `${wciecie}$AdresSerwera     = ${psQuote(opcje.adresSerwera)}`,
    `${wciecie}$KodSkryptu       = ${psQuote(opcje.kod)}`,
    programy,
  ].join('\n');
}

/** Kompletny skrypt (CRLF, bez BOM — BOM dokłada tylko endpoint pobierania pliku). */
export function generateOnboardingScript(tryb: OnboardingTryb, k: KonfiguracjaOnboardingu, opcje: OpcjeSkryptu): string {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`Szablon ${TEMPLATE_PATH} nie zawiera znacznika ${PLACEHOLDER}`);
  }
  // Funkcja zamiast stringu jako zamiennik: w stringu `$'`, `$&` itp. mają w
  // String.replace specjalne znaczenie — a w skrypcie PowerShella `$` jest wszędzie.
  const script = template.replace(PLACEHOLDER, () => blokKonfiguracji(tryb, k, opcje));
  return script.replace(/\r?\n/g, '\r\n');
}

/** Minimalny „skrypt” zwracany dla nieważnego/wygasłego kodu — `irm … | iex` pokaże komunikat. */
export function skryptBledu(komunikat: string): string {
  return `Write-Host ${psQuote(komunikat)} -ForegroundColor Red\r\n`;
}

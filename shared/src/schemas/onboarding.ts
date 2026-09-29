import { z } from 'zod';
import { ONBOARDING_TRYBY } from '../enums';
import { emptyToNull, emptyToUndefined, optionalString, requiredString } from './common';

/** ID pakietu winget, np. "Google.Chrome", "7zip.7zip", "Notepad++.Notepad++". */
export const WINGET_ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/;

/**
 * Nazwa komputera (NetBIOS): 1–15 znaków, litery/cyfry/myślniki, bez myślnika na
 * początku i końcu, nie same cyfry. Numer ewidencyjny typu "KOMP-001" pasuje.
 */
export const NAZWA_KOMPUTERA_REGEX = /^(?!\d+$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,13}[A-Za-z0-9])?$/;

/** Login lokalnego konta Windows: max 20 znaków, bez polskich znaków i spacji. */
export const LOGIN_LOKALNY_REGEX = /^(?!.*\.$)[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;

const nazwaProgramu = requiredString('Nazwa', 100);
const wingetIdSchema = requiredString('ID winget', 150).regex(WINGET_ID_REGEX, 'Nieprawidłowe ID pakietu winget');
/** Parametry cichej instalacji, np. "/qn /norestart" (MSI) albo zgodne z dokumentacją producenta. */
const argumentySchema = optionalString(1000);

/**
 * Pozycja katalogu. Dla źródła PLIK sam plik przychodzi jako multipart obok pól
 * tekstowych (walidowany w server/src/modules/onboarding/oprogramowanie.routes.ts).
 */
export const oprogramowanieCreateSchema = z.discriminatedUnion('zrodlo', [
  z.object({ zrodlo: z.literal('WINGET'), nazwa: nazwaProgramu, wingetId: wingetIdSchema, opis: optionalString(500) }),
  z.object({ zrodlo: z.literal('PLIK'), nazwa: nazwaProgramu, argumenty: argumentySchema, opis: optionalString(500) }),
]);
export type OprogramowanieCreateInput = z.infer<typeof oprogramowanieCreateSchema>;

/** Edycja — źródła nie da się zmienić (usuń i dodaj od nowa); pola spoza danego
 *  źródła serwer ignoruje. Nowy plik (podmiana instalatora) — opcjonalny multipart. */
export const oprogramowanieUpdateSchema = z.object({
  nazwa: nazwaProgramu.optional(),
  wingetId: wingetIdSchema.optional(),
  argumenty: argumentySchema,
  opis: optionalString(500),
});
export type OprogramowanieUpdateInput = z.infer<typeof oprogramowanieUpdateSchema>;

export const profilOprogramowaniaCreateSchema = z.object({
  nazwa: requiredString('Nazwa profilu', 100),
  opis: optionalString(500),
  dzialId: emptyToNull(z.coerce.number().int().positive().nullish()),
  oprogramowanieIds: z.array(z.coerce.number().int().positive()).default([]),
});
export type ProfilOprogramowaniaCreateInput = z.infer<typeof profilOprogramowaniaCreateSchema>;

export const profilOprogramowaniaUpdateSchema = profilOprogramowaniaCreateSchema.partial();
export type ProfilOprogramowaniaUpdateInput = z.infer<typeof profilOprogramowaniaUpdateSchema>;

export const ustawieniaOnboardinguSchema = z.object({
  komunikatTytul: z.string().trim().max(200),
  komunikatTresc: z.string().trim().max(2000),
});
export type UstawieniaOnboardinguInput = z.infer<typeof ustawieniaOnboardinguSchema>;

export const onboardingSesjaCreateSchema = z
  .object({
    computerId: z.coerce.number().int().positive(),
    employeeId: z.coerce.number().int().positive('Wybierz pracownika'),
    tryb: z.enum(ONBOARDING_TRYBY),
    nazwaKomputera: z
      .string()
      .trim()
      .regex(NAZWA_KOMPUTERA_REGEX, 'Nazwa komputera: max 15 znaków — litery, cyfry i myślniki'),
    loginLokalny: emptyToUndefined(
      z.string().trim().regex(LOGIN_LOKALNY_REGEX, 'Login: max 20 znaków, bez polskich znaków i spacji').nullish(),
    ),
    emailM365: emptyToUndefined(z.string().trim().email('Nieprawidłowy adres e-mail').max(254).nullish()),
    /** null = bez komunikatu przy logowaniu. */
    komunikat: z
      .object({
        tytul: requiredString('Tytuł komunikatu', 200),
        tresc: requiredString('Treść komunikatu', 2000),
      })
      .nullable(),
    oprogramowanieIds: z.array(z.coerce.number().int().positive()).default([]),
    /** Microsoft 365 Apps (Word, Excel, Outlook…) — tylko dla licencji z aplikacjami desktopowymi. */
    m365Apps: z.boolean().default(false),
    /** Zadanie w Harmonogramie zadań wysyłające co tydzień odczyt sprzętu do ewidencji. */
    odczytCykliczny: z.boolean().default(true),
    przypiszDoPracownika: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.tryb === 'HOME' && !data.loginLokalny) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['loginLokalny'], message: 'W trybie Home login konta lokalnego jest wymagany' });
    }
  });
export type OnboardingSesjaCreateInput = z.infer<typeof onboardingSesjaCreateSchema>;

import { z } from 'zod';

/** Walidacja parametru :id w ścieżkach REST (string z URL -> dodatnia liczba całkowita). */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Owija schemat tak, by pusty string (typowy dla nietkniętego pola formularza HTML)
 * był traktowany jak "brak wartości" zamiast trafiać do właściwej walidacji (np. regex),
 * gdzie pusty string prawie zawsze by nie przeszedł. Musi opakowywać schemat, który sam
 * akceptuje `undefined` (np. `.nullish()`/`.optional()`).
 */
export const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema);

/** Adres MAC w formacie AA:BB:CC:DD:EE:FF (wielkość liter dowolna), pole opcjonalne. */
export const macAddressSchema = emptyToUndefined(
  z
    .string()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Nieprawidłowy format adresu MAC (AA:BB:CC:DD:EE:FF)')
    .nullish(),
);

/** Prosty string wymagany, przycięty, niepusty — powtarzalny building block dla pól tekstowych. */
export const requiredString = (label: string, max = 255) =>
  z
    .string({ required_error: `${label} jest wymagane` })
    .trim()
    .min(1, `${label} jest wymagane`)
    .max(max, `${label}: maksymalnie ${max} znaków`);

export const optionalString = (max = 255) => z.string().trim().max(max).nullish();

export const numerEwidencyjnySchema = requiredString('Numer ewidencyjny', 64);
export const numerSeryjnySchema = requiredString('Numer seryjny', 128);
export const markaModelSchema = requiredString('Marka/model', 128);

/**
 * Pola informacji zakupowych (data zakupu, koniec gwarancji, koszt brutto)
 * — współdzielone przez komputery, telefony i drukarki. Wszystkie opcjonalne, bo
 * historyczny sprzęt w ewidencji często nie ma tych danych. Powiązanie z fakturą
 * (numer, KSeF, kwota, załączniki) żyje osobno w module Faktury — patrz
 * shared/src/schemas/faktura.ts — bo jedna faktura może obejmować wiele sztuk sprzętu.
 */
export const optionalDateSchema = emptyToUndefined(z.coerce.date().nullish());
export const kosztBruttoGroszeSchema = emptyToUndefined(
  z.coerce.number().int().nonnegative('Koszt nie może być ujemny').nullish(),
);

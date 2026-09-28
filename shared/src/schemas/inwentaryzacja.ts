import { z } from 'zod';
import { SZABLONY_ETYKIET, TYPY_Z_ETYKIETA } from '../enums';
import { optionalString, requiredString } from './common';

/** Sprzęt, który może mieć naklejkę i trafić do spisu (wszystko poza kartą SIM). */
export const sprzetZEtykietaSchema = z.object({
  sprzetTyp: z.enum(TYPY_Z_ETYKIETA),
  sprzetId: z.coerce.number().int().positive(),
});

export const etykietyPdfSchema = z.object({
  pozycje: z.array(sprzetZEtykietaSchema).min(1, 'Wybierz co najmniej jeden sprzęt').max(2000),
  szablon: z.enum(SZABLONY_ETYKIET),
  /** Numer pierwszej wolnej etykiety na arkuszu — żeby dokończyć napoczęty arkusz. */
  pierwszaEtykieta: z.coerce.number().int().min(1).max(100).default(1),
  /** Adres aplikacji widziany z telefonu (np. http://192.168.1.10/sprzet) — trafia do kodów QR. */
  adresAplikacji: z
    .string()
    .trim()
    .max(200)
    .regex(/^https?:\/\/[^\s"'<>]+$/, 'Nieprawidłowy adres aplikacji'),
});
export type EtykietyPdfInput = z.infer<typeof etykietyPdfSchema>;

export const inwentaryzacjaCreateSchema = z.object({
  nazwa: requiredString('Nazwa', 100),
  /** null = cała firma (także sprzęt nieprzypisany i drukarki). */
  dzialId: z.coerce.number().int().positive().nullish(),
});
export type InwentaryzacjaCreateInput = z.infer<typeof inwentaryzacjaCreateSchema>;

export const inwentaryzacjaPotwierdzSchema = z.object({
  uwagi: optionalString(300),
});
export type InwentaryzacjaPotwierdzInput = z.infer<typeof inwentaryzacjaPotwierdzSchema>;

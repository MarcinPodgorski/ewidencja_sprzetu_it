import { z } from 'zod';
import { requiredString } from './common';

export const employeeCreateSchema = z.object({
  imie: requiredString('Imię', 100),
  nazwisko: requiredString('Nazwisko', 100),
  stanowisko: requiredString('Stanowisko', 150),
  /** Służbowy e-mail = login do Microsoft 365. Opcjonalny (nie każdy pracownik ma konto).
   *  Puste pole = null, a nie undefined — inaczej wyczyszczenia adresu w edycji nie dałoby
   *  się zapisać (Prisma pomija pola undefined przy update). */
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().email('Nieprawidłowy adres e-mail').max(254).nullish(),
  ),
  dzialId: z.coerce.number().int().positive('Wybierz dział'),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  aktywny: z.boolean().optional(),
});
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

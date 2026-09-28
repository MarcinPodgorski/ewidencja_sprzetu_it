import { z } from 'zod';
import { emptyToNull, requiredString } from './common';

export const employeeCreateSchema = z.object({
  imie: requiredString('Imię', 100),
  nazwisko: requiredString('Nazwisko', 100),
  stanowisko: requiredString('Stanowisko', 150),
  /** Służbowy e-mail = login do Microsoft 365. Opcjonalny (nie każdy pracownik ma konto). */
  email: emptyToNull(z.string().trim().email('Nieprawidłowy adres e-mail').max(254).nullish()),
  dzialId: z.coerce.number().int().positive('Wybierz dział'),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  aktywny: z.boolean().optional(),
});
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

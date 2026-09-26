import { z } from 'zod';
import { requiredString } from './common';

export const simCardCreateSchema = z.object({
  iccid: requiredString('ICCID', 32),
  numerTelefonu: requiredString('Numer telefonu', 20),
  pin1: z.string().trim().max(16).nullish(),
  pin2: z.string().trim().max(16).nullish(),
  puk1: z.string().trim().max(16).nullish(),
  puk2: z.string().trim().max(16).nullish(),
  taryfa: requiredString('Taryfa', 100),
  kosztMiesiecznyGrosze: z.coerce.number().int().nonnegative('Koszt nie może być ujemny'),
  dataKoncaUmowy: z.coerce.date({ errorMap: () => ({ message: 'Podaj poprawną datę końca umowy' }) }),
});
export type SimCardCreateInput = z.infer<typeof simCardCreateSchema>;

export const simCardUpdateSchema = simCardCreateSchema.partial();
export type SimCardUpdateInput = z.infer<typeof simCardUpdateSchema>;

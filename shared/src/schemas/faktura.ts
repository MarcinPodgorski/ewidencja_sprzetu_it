import { z } from 'zod';
import { optionalString, requiredString } from './common';
import { equipmentRefSchema } from './assignment';

/**
 * Faktura zakupowa — może obejmować jedną lub wiele sztuk sprzętu naraz (patrz
 * `pozycje`, ten sam wzorzec `equipmentRefSchema` co historia przypisań/spisy).
 * Załączniki (PDF/XML) NIE są częścią tego schematu — przychodzą jako multipart
 * pliki obok pól tekstowych, walidowane osobno w server/src/modules/faktury.
 */
export const fakturaCreateSchema = z.object({
  numer: requiredString('Numer faktury', 100),
  numerKsef: optionalString(100),
  kwotaGrosze: z.coerce.number().int().nonnegative('Kwota nie może być ujemna'),
  pozycje: z.array(equipmentRefSchema).min(1, 'Wybierz co najmniej jedną sztukę sprzętu'),
});
export type FakturaCreateInput = z.infer<typeof fakturaCreateSchema>;

export const fakturaUpdateSchema = fakturaCreateSchema.partial();
export type FakturaUpdateInput = z.infer<typeof fakturaUpdateSchema>;

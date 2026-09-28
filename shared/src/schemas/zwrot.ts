import { z } from 'zod';
import { equipmentRefSchema } from './assignment';
import { optionalString } from './common';

/** Stan/uwagi przy zwracanej pozycji, np. „porysowana obudowa” — trafiają do protokołu. */
const uwagi = optionalString(300);

/**
 * Zwrot sprzętu przez pracownika — także przy odejściu z firmy. Zwrócone pozycje tracą
 * przypisanie (z wpisem w historii), zwrócone „Różne” są usuwane, a protokół PDF
 * powstaje z migawki zapisanej w bazie.
 */
export const zwrotSprzetuSchema = z.object({
  pozycje: z.array(equipmentRefSchema.extend({ uwagi })).max(200).default([]),
  rozne: z.array(z.object({ id: z.coerce.number().int().positive(), uwagi })).max(200).default([]),
  /** Odejście z firmy: inny tytuł protokołu i lista kontrolna po zapisaniu. */
  odejscie: z.boolean().default(false),
  /** Dezaktywacja pracownika razem ze zwrotem (zwykle przy odejściu). */
  dezaktywuj: z.boolean().default(false),
  notatka: optionalString(1000),
});
export type ZwrotSprzetuInput = z.infer<typeof zwrotSprzetuSchema>;

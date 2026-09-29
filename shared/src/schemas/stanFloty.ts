import { z } from 'zod';
import { SEKCJE_STANU_FLOTY } from '../enums';

export const ustawieniaStanuFlotySchema = z.object({
  ukryteSekcje: z.array(z.enum(SEKCJE_STANU_FLOTY)).max(SEKCJE_STANU_FLOTY.length),
});
export type UstawieniaStanuFlotyInput = z.infer<typeof ustawieniaStanuFlotySchema>;

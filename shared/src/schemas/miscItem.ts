import { z } from 'zod';

/** "Różne" — drobne dodatki przypisane do pracownika (patrz model MiscItem):
 *  celowo tylko jedno pole, żadnych numerów ewidencyjnych/seryjnych. */
export const miscItemCreateSchema = z.object({
  opis: z.string().trim().min(1, 'Opis jest wymagany').max(200, 'Maksymalnie 200 znaków'),
});
export type MiscItemCreateInput = z.infer<typeof miscItemCreateSchema>;

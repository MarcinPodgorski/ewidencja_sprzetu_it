import { z } from 'zod';
import { requiredString } from './common';

export const tonerCreateSchema = z.object({
  oznaczenie: requiredString('Oznaczenie', 100),
  ilosc: z.coerce.number().int().nonnegative('Ilość nie może być ujemna'),
});
export type TonerCreateInput = z.infer<typeof tonerCreateSchema>;

export const tonerUpdateSchema = tonerCreateSchema.partial();
export type TonerUpdateInput = z.infer<typeof tonerUpdateSchema>;

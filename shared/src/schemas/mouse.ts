import { z } from 'zod';
import { markaModelSchema, numerEwidencyjnySchema, numerSeryjnySchema } from './common';

export const mouseCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  markaModel: markaModelSchema,
  czyZestaw: z.boolean().default(false),
});
export type MouseCreateInput = z.infer<typeof mouseCreateSchema>;

export const mouseUpdateSchema = mouseCreateSchema.partial();
export type MouseUpdateInput = z.infer<typeof mouseUpdateSchema>;

export const pairKeyboardSchema = z.object({
  keyboardId: z.coerce.number().int().positive(),
});
export type PairKeyboardInput = z.infer<typeof pairKeyboardSchema>;

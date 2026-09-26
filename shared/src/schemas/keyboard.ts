import { z } from 'zod';
import { markaModelSchema, numerEwidencyjnySchema, numerSeryjnySchema } from './common';

export const keyboardCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  markaModel: markaModelSchema,
  czyZestaw: z.boolean().default(false),
});
export type KeyboardCreateInput = z.infer<typeof keyboardCreateSchema>;

export const keyboardUpdateSchema = keyboardCreateSchema.partial();
export type KeyboardUpdateInput = z.infer<typeof keyboardUpdateSchema>;

export const pairMouseSchema = z.object({
  mouseId: z.coerce.number().int().positive(),
});
export type PairMouseInput = z.infer<typeof pairMouseSchema>;

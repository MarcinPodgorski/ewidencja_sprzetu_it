import { z } from 'zod';
import { markaModelSchema, numerEwidencyjnySchema, numerSeryjnySchema, requiredString } from './common';

export const monitorCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  markaModel: markaModelSchema,
  zlacza: requiredString('Złącza', 200),
  proporcjeEkranu: requiredString('Proporcje ekranu', 20),
  wielkoscEkranu: z.coerce.number().positive('Podaj wielkość ekranu w calach'),
});
export type MonitorCreateInput = z.infer<typeof monitorCreateSchema>;

export const monitorUpdateSchema = monitorCreateSchema.partial();
export type MonitorUpdateInput = z.infer<typeof monitorUpdateSchema>;

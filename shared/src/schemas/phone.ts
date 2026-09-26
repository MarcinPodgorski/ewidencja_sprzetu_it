import { z } from 'zod';
import {
  emptyToUndefined,
  kosztBruttoGroszeSchema,
  markaModelSchema,
  numerEwidencyjnySchema,
  numerSeryjnySchema,
  optionalDateSchema,
  requiredString,
} from './common';
import { PHONE_TYPES } from '../enums';

export const phoneCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  markaModel: markaModelSchema,
  typ: z.enum(PHONE_TYPES),
  imei: requiredString('IMEI', 32),
  kodOdblokowania: z.string().trim().max(64).nullish(),
  simCardId: emptyToUndefined(z.coerce.number().int().positive().nullish()),
  dataZakupu: optionalDateSchema,
  dataKoncaGwarancji: optionalDateSchema,
  kosztBruttoGrosze: kosztBruttoGroszeSchema,
});
export type PhoneCreateInput = z.infer<typeof phoneCreateSchema>;

export const phoneUpdateSchema = phoneCreateSchema.partial();
export type PhoneUpdateInput = z.infer<typeof phoneUpdateSchema>;

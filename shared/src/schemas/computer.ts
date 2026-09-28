import { z } from 'zod';
import {
  emptyToNull,
  kosztBruttoGroszeSchema,
  macAddressSchema,
  markaModelSchema,
  numerEwidencyjnySchema,
  numerSeryjnySchema,
  optionalDateSchema,
  optionalString,
  requiredString,
} from './common';
import { COMPUTER_TYPES, RAM_TYPES, SYSTEMY_OPERACYJNE } from '../enums';

export const computerCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  typ: z.enum(COMPUTER_TYPES),
  cpu: requiredString('CPU', 128),
  ramIloscGb: z.coerce.number().int().positive('Podaj ilość RAM w GB'),
  ramRodzaj: z.enum(RAM_TYPES),
  markaModel: markaModelSchema,
  pojemnoscDysku: requiredString('Pojemność dysku', 64),
  systemOperacyjny: emptyToNull(z.enum(SYSTEMY_OPERACYJNE).nullish()),
  wersjaSystemu: optionalString(100),
  macEthernet: macAddressSchema,
  macWifi: macAddressSchema,
  notatki: z.string().trim().max(4000).nullish(),
  dataZakupu: optionalDateSchema,
  dataKoncaGwarancji: optionalDateSchema,
  kosztBruttoGrosze: kosztBruttoGroszeSchema,
});
export type ComputerCreateInput = z.infer<typeof computerCreateSchema>;

export const computerUpdateSchema = computerCreateSchema.partial();
export type ComputerUpdateInput = z.infer<typeof computerUpdateSchema>;

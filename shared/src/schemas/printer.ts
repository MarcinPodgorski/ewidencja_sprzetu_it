import { z } from 'zod';
import {
  emptyToNull,
  kosztBruttoGroszeSchema,
  macAddressSchema,
  markaModelSchema,
  numerEwidencyjnySchema,
  numerSeryjnySchema,
  optionalDateSchema,
  requiredString,
} from './common';

export const printerCreateSchema = z.object({
  numerEwidencyjny: numerEwidencyjnySchema,
  numerSeryjny: numerSeryjnySchema,
  markaModel: markaModelSchema,
  dzialPietroMiejsce: requiredString('Dział/piętro/miejsce', 150),
  adresIP: emptyToNull(
    z
      .string()
      .trim()
      .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Nieprawidłowy adres IP')
      .nullish(),
  ),
  mac: macAddressSchema,
  dataZakupu: optionalDateSchema,
  dataKoncaGwarancji: optionalDateSchema,
  kosztBruttoGrosze: kosztBruttoGroszeSchema,
});
export type PrinterCreateInput = z.infer<typeof printerCreateSchema>;

export const printerUpdateSchema = printerCreateSchema.partial();
export type PrinterUpdateInput = z.infer<typeof printerUpdateSchema>;

export const relocatePrinterSchema = z.object({
  lokalizacja: requiredString('Nowa lokalizacja', 150),
});
export type RelocatePrinterInput = z.infer<typeof relocatePrinterSchema>;

export const addPrinterTonerSchema = z.object({
  tonerId: z.coerce.number().int().positive(),
});
export type AddPrinterTonerInput = z.infer<typeof addPrinterTonerSchema>;

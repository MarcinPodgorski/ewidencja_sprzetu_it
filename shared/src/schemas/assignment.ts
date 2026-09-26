import { z } from 'zod';
import { EQUIPMENT_TYPES } from '../enums';

export const assignEquipmentSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  notatka: z.string().trim().max(1000).nullish(),
});
export type AssignEquipmentInput = z.infer<typeof assignEquipmentSchema>;

export const unassignEquipmentSchema = z.object({
  notatka: z.string().trim().max(1000).nullish(),
});
export type UnassignEquipmentInput = z.infer<typeof unassignEquipmentSchema>;

/** Referencja do konkretnej sztuki sprzętu w tabelach generycznych (historia, pozycje spisów). */
export const equipmentRefSchema = z.object({
  sprzetTyp: z.enum(EQUIPMENT_TYPES),
  sprzetId: z.coerce.number().int().positive(),
});
export type EquipmentRef = z.infer<typeof equipmentRefSchema>;

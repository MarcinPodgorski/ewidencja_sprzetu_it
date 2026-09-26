import { z } from 'zod';
import { requiredString } from './common';
import { PERMISSION_LEVELS } from '../enums';
import { equipmentRefSchema } from './assignment';

export const equipmentListCreateSchema = z.object({
  nazwa: requiredString('Nazwa spisu', 150),
  dzialId: z.coerce.number().int().positive('Wybierz dział'),
  opis: z.string().trim().max(2000).nullish(),
});
export type EquipmentListCreateInput = z.infer<typeof equipmentListCreateSchema>;

export const equipmentListUpdateSchema = equipmentListCreateSchema.partial();
export type EquipmentListUpdateInput = z.infer<typeof equipmentListUpdateSchema>;

export const addEquipmentListItemSchema = equipmentRefSchema;
export type AddEquipmentListItemInput = z.infer<typeof addEquipmentListItemSchema>;

export const grantEquipmentListPermissionSchema = z.object({
  appUserId: z.coerce.number().int().positive(),
  poziom: z.enum(PERMISSION_LEVELS),
});
export type GrantEquipmentListPermissionInput = z.infer<typeof grantEquipmentListPermissionSchema>;

export const updateEquipmentListPermissionSchema = z.object({
  poziom: z.enum(PERMISSION_LEVELS),
});
export type UpdateEquipmentListPermissionInput = z.infer<typeof updateEquipmentListPermissionSchema>;

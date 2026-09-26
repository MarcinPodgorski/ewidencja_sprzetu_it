import { z } from 'zod';
import { equipmentRefSchema } from './assignment';

// `items` obejmuje sprzęt z generycznej maszynerii (EquipmentType); `miscItemIds`
// to osobne odniesienie do MiscItem ("Różne" — patrz shared/src/schemas/miscItem.ts),
// który celowo żyje poza EquipmentType, więc nie pasuje do `equipmentRefSchema`.
export const generateProtocolSchema = z
  .object({
    employeeId: z.coerce.number().int().positive(),
    items: z.array(equipmentRefSchema).default([]),
    miscItemIds: z.array(z.coerce.number().int().positive()).default([]),
  })
  .refine((data) => data.items.length + data.miscItemIds.length > 0, {
    message: 'Wybierz co najmniej jedną pozycję do protokołu',
    path: ['items'],
  });
export type GenerateProtocolInput = z.infer<typeof generateProtocolSchema>;

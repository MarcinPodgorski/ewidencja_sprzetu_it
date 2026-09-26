import { phoneCreateSchema, phoneUpdateSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';

export const phonesRouter = createEquipmentRouter({
  sprzetTyp: 'TELEFON',
  delegate: prisma.phone,
  createSchema: phoneCreateSchema,
  updateSchema: phoneUpdateSchema,
  searchFields: ['numerEwidencyjny', 'numerSeryjny', 'markaModel', 'imei'],
  modelName: 'phone',
  filterableFields: ['typ'],
});

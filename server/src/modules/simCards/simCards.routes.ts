import { simCardCreateSchema, simCardUpdateSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';

export const simCardsRouter = createEquipmentRouter({
  sprzetTyp: 'KARTA_SIM',
  delegate: prisma.simCard,
  createSchema: simCardCreateSchema,
  updateSchema: simCardUpdateSchema,
  searchFields: ['iccid', 'numerTelefonu'],
  modelName: 'simCard',
});

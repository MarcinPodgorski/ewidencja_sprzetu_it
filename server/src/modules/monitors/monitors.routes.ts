import { monitorCreateSchema, monitorUpdateSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';

export const monitorsRouter = createEquipmentRouter({
  sprzetTyp: 'MONITOR',
  delegate: prisma.monitor,
  createSchema: monitorCreateSchema,
  updateSchema: monitorUpdateSchema,
  searchFields: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  modelName: 'monitor',
});

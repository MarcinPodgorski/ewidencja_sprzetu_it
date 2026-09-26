import { computerCreateSchema, computerUpdateSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';

export const computersRouter = createEquipmentRouter({
  sprzetTyp: 'KOMPUTER',
  delegate: prisma.computer,
  createSchema: computerCreateSchema,
  updateSchema: computerUpdateSchema,
  searchFields: ['numerEwidencyjny', 'numerSeryjny', 'markaModel', 'cpu'],
  modelName: 'computer',
  filterableFields: ['typ', 'ramRodzaj'],
});

import { keyboardCreateSchema, keyboardUpdateSchema, pairMouseSchema, idParamSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';
import { asyncHandler } from '../../middleware/errorHandler';
import { pairMouseAndKeyboard, unpairKeyboard } from '../equipment/peripheralPairing.service';

export const keyboardsRouter = createEquipmentRouter({
  sprzetTyp: 'KLAWIATURA',
  delegate: prisma.keyboard,
  createSchema: keyboardCreateSchema,
  updateSchema: keyboardUpdateSchema,
  searchFields: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  modelName: 'keyboard',
  extraInclude: { pair: { include: { mouse: true } } },
  filterableFields: ['czyZestaw'],
});

keyboardsRouter.post(
  '/:id/pair',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { mouseId } = pairMouseSchema.parse(req.body);
    await pairMouseAndKeyboard(mouseId, id);
    res.status(204).end();
  }),
);

keyboardsRouter.post(
  '/:id/unpair',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await unpairKeyboard(id);
    res.status(204).end();
  }),
);

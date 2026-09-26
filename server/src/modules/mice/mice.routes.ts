import { mouseCreateSchema, mouseUpdateSchema, pairKeyboardSchema, idParamSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { createEquipmentRouter } from '../equipment/equipmentRouterFactory';
import { asyncHandler } from '../../middleware/errorHandler';
import { pairMouseAndKeyboard, unpairMouse } from '../equipment/peripheralPairing.service';

export const miceRouter = createEquipmentRouter({
  sprzetTyp: 'MYSZ',
  delegate: prisma.mouse,
  createSchema: mouseCreateSchema,
  updateSchema: mouseUpdateSchema,
  searchFields: ['numerEwidencyjny', 'numerSeryjny', 'markaModel'],
  modelName: 'mouse',
  extraInclude: { pair: { include: { keyboard: true } } },
  filterableFields: ['czyZestaw'],
});

miceRouter.post(
  '/:id/pair',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { keyboardId } = pairKeyboardSchema.parse(req.body);
    await pairMouseAndKeyboard(id, keyboardId);
    res.status(204).end();
  }),
);

miceRouter.post(
  '/:id/unpair',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await unpairMouse(id);
    res.status(204).end();
  }),
);

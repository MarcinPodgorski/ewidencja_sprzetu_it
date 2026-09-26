import { Router } from 'express';
import { tonerCreateSchema, tonerUpdateSchema, idParamSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

export const tonersRouter = Router();

tonersRouter.use(requireAuth, requireRole('ADMIN'));

// Ten sam próg co alert "niski stan" na dashboardzie (dashboard.routes.ts).
const LOW_STOCK_THRESHOLD = 2;

tonersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: Record<string, unknown> = {};
    if (q) where.oznaczenie = { contains: q };
    if (req.query.niskiStan === 'true') where.ilosc = { lte: LOW_STOCK_THRESHOLD };

    const items = await prisma.toner.findMany({
      where,
      include: { drukarki: { include: { printer: true } } },
      orderBy: { oznaczenie: 'asc' },
    });
    res.json({ items });
  }),
);

tonersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const item = await prisma.toner.findUnique({
      where: { id },
      include: { drukarki: { include: { printer: true } } },
    });
    if (!item) throw new AppError(404, 'Nie znaleziono tonera/tuszu');
    res.json({ item });
  }),
);

tonersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = tonerCreateSchema.parse(req.body);
    const item = await prisma.toner.create({ data });
    res.status(201).json({ item });
  }),
);

tonersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = tonerUpdateSchema.parse(req.body);
    const item = await prisma.toner.update({ where: { id }, data });
    res.json({ item });
  }),
);

tonersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.toner.delete({ where: { id } });
    res.status(204).end();
  }),
);

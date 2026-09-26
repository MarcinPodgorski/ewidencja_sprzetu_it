import { Router } from 'express';
import {
  printerCreateSchema,
  printerUpdateSchema,
  relocatePrinterSchema,
  addPrinterTonerSchema,
  idParamSchema,
} from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import * as assignmentHistoryService from '../assignmentHistory/assignmentHistory.service';

export const printersRouter = Router();

printersRouter.use(requireAuth, requireRole('ADMIN'));

const tonerInclude = { tonery: { include: { toner: true } } };

printersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    // Trójstanowy filtr statusu: brak parametru = wszystkie, 'true'/'false' = tylko
    // nieaktywne/aktywne.
    const where: Record<string, unknown> = {};
    if (req.query.wycofany === 'true') where.wycofany = true;
    else if (req.query.wycofany === 'false') where.wycofany = false;

    if (q) {
      where.OR = ['numerEwidencyjny', 'numerSeryjny', 'markaModel', 'dzialPietroMiejsce'].map((field) => ({
        [field]: { contains: q },
      }));
    }

    const items = await prisma.printer.findMany({ where, include: tonerInclude, orderBy: { id: 'asc' } });
    res.json({ items });
  }),
);

printersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const item = await prisma.printer.findUnique({ where: { id }, include: tonerInclude });
    if (!item) throw new AppError(404, 'Nie znaleziono drukarki');
    res.json({ item });
  }),
);

printersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = printerCreateSchema.parse(req.body);
    const item = await prisma.printer.create({ data });
    res.status(201).json({ item });
  }),
);

printersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = printerUpdateSchema.parse(req.body);
    const item = await prisma.printer.update({ where: { id }, data });
    res.json({ item });
  }),
);

printersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const item = await prisma.printer.update({
      where: { id },
      data: { wycofany: true, dataWycofania: new Date() },
    });
    res.json({ item });
  }),
);

/** Odwrotność archiwizacji — przywraca drukarkę do statusu aktywnego. */
printersRouter.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const item = await prisma.printer.update({
      where: { id },
      data: { wycofany: false, dataWycofania: null },
      include: tonerInclude,
    });
    res.json({ item });
  }),
);

printersRouter.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const history = await assignmentHistoryService.getHistory('DRUKARKA', id);
    res.json({ history });
  }),
);

printersRouter.post(
  '/:id/relocate',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { lokalizacja } = relocatePrinterSchema.parse(req.body);
    const item = await assignmentHistoryService.relocatePrinter({
      sprzetId: id,
      lokalizacja,
      actorAppUserId: req.user!.id,
    });
    res.json({ item });
  }),
);

printersRouter.post(
  '/:id/toners',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { tonerId } = addPrinterTonerSchema.parse(req.body);
    const toner = await prisma.toner.findUnique({ where: { id: tonerId } });
    if (!toner) throw new AppError(404, 'Nie znaleziono tonera/tuszu');
    await prisma.printerToner.upsert({
      where: { printerId_tonerId: { printerId: id, tonerId } },
      create: { printerId: id, tonerId },
      update: {},
    });
    const item = await prisma.printer.findUnique({ where: { id }, include: tonerInclude });
    res.status(201).json({ item });
  }),
);

printersRouter.delete(
  '/:id/toners/:tonerId',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const tonerId = Number(req.params.tonerId);
    if (!Number.isInteger(tonerId) || tonerId <= 0) {
      throw new AppError(400, 'Nieprawidłowy identyfikator tonera');
    }
    await prisma.printerToner.deleteMany({ where: { printerId: id, tonerId } });
    const item = await prisma.printer.findUnique({ where: { id }, include: tonerInclude });
    res.json({ item });
  }),
);

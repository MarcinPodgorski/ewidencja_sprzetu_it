import { Router } from 'express';
import { z } from 'zod';
import { ENCJE_HISTORII } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

export const historiaZmianRouter = Router();

historiaZmianRouter.use(requireAuth, requireRole('ADMIN'));

const zapytanieSchema = z.object({
  encja: z.enum(ENCJE_HISTORII),
  encjaId: z.coerce.number().int().positive(),
});

historiaZmianRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { encja, encjaId } = zapytanieSchema.parse(req.query);
    const wpisy = await prisma.zmianaDanych.findMany({
      where: { encja, encjaId },
      include: { appUser: { select: { id: true, login: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ items: wpisy.map((w) => ({ ...w, zmiany: JSON.parse(w.zmiany) })) });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { szukaj } from './szukaj.service';

/** Wyszukiwarka całej ewidencji (Ctrl+K): sprzęt, pracownicy, faktury, spisy. */
export const szukajRouter = Router();

szukajRouter.use(requireAuth, requireRole('ADMIN'));

const zapytanieSchema = z.object({ q: z.string().max(200).default('') });

szukajRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = zapytanieSchema.parse(req.query);
    res.json(await szukaj(q));
  }),
);

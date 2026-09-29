import { Router } from 'express';
import { ustawieniaStanuFlotySchema } from 'shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { obliczStanFloty, zapiszUkryteSekcje } from './stanFloty.service';

/** Przegląd floty: Windows 10, BitLocker, Entra ID, gwarancje, wiek sprzętu, aktualność odczytów. */
export const stanFlotyRouter = Router();

stanFlotyRouter.use(requireAuth, requireRole('ADMIN'));

stanFlotyRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await obliczStanFloty());
  }),
);

/** Które sekcje ukryć (np. Windows 10, którego świadomie się nie wymienia) — dotyczy też pulpitu. */
stanFlotyRouter.put(
  '/ustawienia',
  asyncHandler(async (req, res) => {
    const { ukryteSekcje } = ustawieniaStanuFlotySchema.parse(req.body);
    res.json({ ukryteSekcje: await zapiszUkryteSekcje(ukryteSekcje) });
  }),
);

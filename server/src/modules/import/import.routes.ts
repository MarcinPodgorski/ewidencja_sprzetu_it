import { Router } from 'express';
import { importSchema } from 'shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { importuj } from './import.service';

/** Import z Excela/CSV: sprawdzenie (podgląd) albo zapis poprawnych wierszy. */
export const importRouter = Router();

importRouter.use(requireAuth, requireRole('ADMIN'));

importRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = importSchema.parse(req.body);
    res.json(await importuj(input, req.user!.id));
  }),
);

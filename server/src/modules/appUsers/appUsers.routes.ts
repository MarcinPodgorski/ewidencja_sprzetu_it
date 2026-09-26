import { Router } from 'express';
import { appUserCreateSchema, appUserUpdateSchema, resetPasswordSchema, idParamSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { hashPassword } from '../../utils/password';

export const appUsersRouter = Router();

appUsersRouter.use(requireAuth, requireRole('ADMIN'));

const publicSelect = {
  id: true,
  imie: true,
  nazwisko: true,
  login: true,
  rola: true,
  aktywny: true,
  createdAt: true,
  updatedAt: true,
} as const;

appUsersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.appUser.findMany({ select: publicSelect, orderBy: { login: 'asc' } });
    res.json({ items });
  }),
);

appUsersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = appUserCreateSchema.parse(req.body);
    const hasloHash = await hashPassword(data.haslo);
    const item = await prisma.appUser.create({
      data: { imie: data.imie, nazwisko: data.nazwisko, login: data.login, rola: data.rola, hasloHash },
      select: publicSelect,
    });
    res.status(201).json({ item });
  }),
);

appUsersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = appUserUpdateSchema.parse(req.body);

    if (data.aktywny === false && id === req.user!.id) {
      throw new AppError(400, 'Nie możesz dezaktywować własnego konta');
    }

    const item = await prisma.appUser.update({ where: { id }, data, select: publicSelect });
    res.json({ item });
  }),
);

appUsersRouter.put(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { noweHaslo } = resetPasswordSchema.parse(req.body);
    const hasloHash = await hashPassword(noweHaslo);
    await prisma.appUser.update({ where: { id }, data: { hasloHash } });
    res.status(204).end();
  }),
);

appUsersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    if (id === req.user!.id) {
      throw new AppError(400, 'Nie możesz dezaktywować własnego konta');
    }
    const item = await prisma.appUser.update({ where: { id }, data: { aktywny: false }, select: publicSelect });
    res.json({ item });
  }),
);

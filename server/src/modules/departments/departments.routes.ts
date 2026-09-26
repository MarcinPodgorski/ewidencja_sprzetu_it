import { Router } from 'express';
import { departmentCreateSchema, departmentUpdateSchema, idParamSchema } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);

// Lista działów jest dostępna każdemu zalogowanemu (potrzebna np. do wyboru działu
// przy tworzeniu spisu) — sama nazwa działu nie jest daną wrażliwą.
departmentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.department.findMany({ orderBy: { nazwa: 'asc' } });
    res.json({ items });
  }),
);

departmentsRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = departmentCreateSchema.parse(req.body);
    const item = await prisma.department.create({ data });
    res.status(201).json({ item });
  }),
);

departmentsRouter.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = departmentUpdateSchema.parse(req.body);
    const item = await prisma.department.update({ where: { id }, data });
    res.json({ item });
  }),
);

departmentsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const employeeCount = await prisma.employee.count({ where: { dzialId: id } });
    if (employeeCount > 0) {
      throw new AppError(409, 'Nie można usunąć działu, do którego przypisani są pracownicy');
    }
    await prisma.department.delete({ where: { id } });
    res.status(204).end();
  }),
);

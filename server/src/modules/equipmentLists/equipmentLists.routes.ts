import { Router } from 'express';
import {
  equipmentListCreateSchema,
  equipmentListUpdateSchema,
  addEquipmentListItemSchema,
  grantEquipmentListPermissionSchema,
  updateEquipmentListPermissionSchema,
  idParamSchema,
  type EquipmentType,
} from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole, requireListPermission } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { getEquipmentSummary } from '../equipment/equipmentLookup';

export const equipmentListsRouter = Router();

equipmentListsRouter.use(requireAuth);

/** Lista spisów: admin widzi wszystkie, "user" tylko te z jakimkolwiek nadanym uprawnieniem. */
equipmentListsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.rola === 'ADMIN';
    const items = await prisma.equipmentList.findMany({
      where: isAdmin ? {} : { permissions: { some: { appUserId: req.user!.id } } },
      include: isAdmin
        ? { dzial: true, _count: { select: { items: true } } }
        : { dzial: true, _count: { select: { items: true } }, permissions: { where: { appUserId: req.user!.id } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }),
);

equipmentListsRouter.get(
  '/:id',
  requireListPermission('VIEW'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const list = await prisma.equipmentList.findUnique({
      where: { id },
      include: { dzial: true, items: { orderBy: { dodanoAt: 'asc' } } },
    });
    if (!list) throw new AppError(404, 'Nie znaleziono spisu');

    const items = await Promise.all(
      list.items.map(async (item) => ({
        ...item,
        sprzet: await getEquipmentSummary(item.sprzetTyp as EquipmentType, item.sprzetId),
      })),
    );

    // Jawna informacja o poziomie dostępu wywołującego — frontend pokazuje/ukrywa
    // widżet dodawania pozycji bez zgadywania na podstawie samej listy uprawnień.
    let myAccessLevel: 'ADMIN' | 'VIEW' | 'EDIT' = 'VIEW';
    if (req.user!.rola === 'ADMIN') {
      myAccessLevel = 'ADMIN';
    } else {
      const permission = await prisma.equipmentListPermission.findUnique({
        where: { listId_appUserId: { listId: id, appUserId: req.user!.id } },
      });
      myAccessLevel = permission?.poziom === 'EDIT' ? 'EDIT' : 'VIEW';
    }

    res.json({ list: { ...list, items }, myAccessLevel });
  }),
);

equipmentListsRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = equipmentListCreateSchema.parse(req.body);
    const list = await prisma.equipmentList.create({
      data: { ...data, utworzylAppUserId: req.user!.id },
      include: { dzial: true },
    });
    res.status(201).json({ list });
  }),
);

equipmentListsRouter.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = equipmentListUpdateSchema.parse(req.body);
    const list = await prisma.equipmentList.update({ where: { id }, data, include: { dzial: true } });
    res.json({ list });
  }),
);

equipmentListsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.equipmentList.delete({ where: { id } });
    res.status(204).end();
  }),
);

equipmentListsRouter.post(
  '/:id/items',
  requireListPermission('EDIT'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { sprzetTyp, sprzetId } = addEquipmentListItemSchema.parse(req.body);

    const summary = await getEquipmentSummary(sprzetTyp, sprzetId);
    if (!summary) throw new AppError(404, 'Nie znaleziono wskazanego sprzętu');

    const item = await prisma.equipmentListItem.create({
      data: { listId: id, sprzetTyp, sprzetId, dodalAppUserId: req.user!.id },
    });
    res.status(201).json({ item: { ...item, sprzet: summary } });
  }),
);

equipmentListsRouter.delete(
  '/:id/items/:itemId',
  requireListPermission('EDIT'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError(400, 'Nieprawidłowy identyfikator pozycji');
    }
    await prisma.equipmentListItem.deleteMany({ where: { id: itemId, listId: id } });
    res.status(204).end();
  }),
);

equipmentListsRouter.get(
  '/:id/permissions',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const permissions = await prisma.equipmentListPermission.findMany({
      where: { listId: id },
      include: { appUser: { select: { id: true, imie: true, nazwisko: true, login: true } } },
      orderBy: { nadanoAt: 'asc' },
    });
    res.json({ permissions });
  }),
);

equipmentListsRouter.post(
  '/:id/permissions',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { appUserId, poziom } = grantEquipmentListPermissionSchema.parse(req.body);
    const permission = await prisma.equipmentListPermission.create({
      data: { listId: id, appUserId, poziom, nadalAppUserId: req.user!.id },
      include: { appUser: { select: { id: true, imie: true, nazwisko: true, login: true } } },
    });
    res.status(201).json({ permission });
  }),
);

equipmentListsRouter.put(
  '/:id/permissions/:permId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const permId = Number(req.params.permId);
    if (!Number.isInteger(permId) || permId <= 0) {
      throw new AppError(400, 'Nieprawidłowy identyfikator uprawnienia');
    }
    const { poziom } = updateEquipmentListPermissionSchema.parse(req.body);
    const permission = await prisma.equipmentListPermission.update({
      where: { id: permId },
      data: { poziom },
      include: { appUser: { select: { id: true, imie: true, nazwisko: true, login: true } } },
    });
    res.json({ permission });
  }),
);

equipmentListsRouter.delete(
  '/:id/permissions/:permId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const permId = Number(req.params.permId);
    if (!Number.isInteger(permId) || permId <= 0) {
      throw new AppError(400, 'Nieprawidłowy identyfikator uprawnienia');
    }
    await prisma.equipmentListPermission.delete({ where: { id: permId } });
    res.status(204).end();
  }),
);

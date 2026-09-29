import { Router } from 'express';
import { employeeCreateSchema, employeeUpdateSchema, idParamSchema, miscItemCreateSchema } from 'shared';
import type { EquipmentType } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { getEquipmentSummary } from '../equipment/equipmentLookup';
import { pracownikDoHistorii, zapiszZmiane } from '../historiaZmian/historiaZmian.service';
import { listaZwrotow, protokolZwrotu, sprzetPracownika, zapiszZwrot } from './zwroty';

export const employeesRouter = Router();

employeesRouter.use(requireAuth, requireRole('ADMIN'));

employeesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    // Tri-state jak przy filtrze `wycofany` sprzętu: brak parametru = tylko aktywni
    // (zachowanie wsteczne dla miejsc, które nie przekazują filtra, np. AssignmentPanel),
    // 'true'/'false' = jawnie aktywni/nieaktywni, 'all' = wszyscy.
    let aktywny: boolean | undefined;
    if (req.query.aktywny === undefined || req.query.aktywny === 'true') aktywny = true;
    else if (req.query.aktywny === 'false') aktywny = false;

    const dzialId = req.query.dzialId ? Number(req.query.dzialId) : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const where: Record<string, unknown> = {};
    if (aktywny !== undefined) where.aktywny = aktywny;
    if (dzialId) where.dzialId = dzialId;
    if (q) {
      // Każde słowo z zapytania musi pasować do imienia LUB nazwiska — pozwala
      // znaleźć zarówno samo "Kowalski", jak i "Jan Kowalski" naraz.
      where.AND = q.split(/\s+/).map((word) => ({
        OR: [{ imie: { contains: word } }, { nazwisko: { contains: word } }],
      }));
    }

    const items = await prisma.employee.findMany({
      where,
      include: { dzial: true },
      orderBy: [{ nazwisko: 'asc' }, { imie: 'asc' }],
    });
    res.json({ items });
  }),
);

employeesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const item = await prisma.employee.findUnique({ where: { id }, include: { dzial: true } });
    if (!item) throw new AppError(404, 'Nie znaleziono pracownika');
    res.json({ item });
  }),
);

employeesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = employeeCreateSchema.parse(req.body);
    const item = await prisma.employee.create({ data, include: { dzial: true } });
    await zapiszZmiane({ encja: 'PRACOWNIK', encjaId: item.id, operacja: 'UTWORZENIE', po: pracownikDoHistorii(item), appUserId: req.user!.id });
    res.status(201).json({ item });
  }),
);

employeesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = employeeUpdateSchema.parse(req.body);
    const przed = await prisma.employee.findUnique({ where: { id }, include: { dzial: true } });
    const item = await prisma.employee.update({ where: { id }, data, include: { dzial: true } });
    await zapiszZmiane({
      encja: 'PRACOWNIK',
      encjaId: id,
      operacja: 'EDYCJA',
      przed: przed && pracownikDoHistorii(przed),
      po: pracownikDoHistorii(item),
      appUserId: req.user!.id,
    });
    res.json({ item });
  }),
);

// "Usunięcie" pracownika = dezaktywacja — zachowuje integralność historii przypisań.
employeesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const przed = await prisma.employee.findUnique({ where: { id } });
    const item = await prisma.employee.update({ where: { id }, data: { aktywny: false } });
    await zapiszZmiane({ encja: 'PRACOWNIK', encjaId: id, operacja: 'EDYCJA', przed, po: item, appUserId: req.user!.id, kontekst: 'dezaktywacja' });
    res.json({ item });
  }),
);

employeesRouter.get(
  '/:id/equipment',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    res.json({ items: await sprzetPracownika(id) });
  }),
);

/** Zwrot sprzętu (także przy odejściu pracownika) i protokoły zwrotu — patrz zwroty.ts. */
employeesRouter.post('/:id/zwrot', asyncHandler(zapiszZwrot));
employeesRouter.get('/:id/zwroty', asyncHandler(listaZwrotow));
employeesRouter.get('/:id/zwroty/:zwrotId/protokol', asyncHandler(protokolZwrotu));

employeesRouter.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const history = await prisma.assignmentHistory.findMany({
      where: { uzytkownikId: id },
      include: {
        uzytkownik: { include: { dzial: true } },
        utworzylAppUser: { select: { id: true, imie: true, nazwisko: true, login: true } },
      },
      orderBy: { dataOd: 'desc' },
    });

    // Historia pracownika ma sens tylko wzbogacona o to, JAKI sprzęt dotyczył danego
    // wpisu (samo "uzytkownik" to zawsze ten sam pracownik, nieprzydatne tutaj).
    const enriched = await Promise.all(
      history.map(async (h) => ({
        ...h,
        sprzet: await getEquipmentSummary(h.sprzetTyp as EquipmentType, h.sprzetId),
      })),
    );

    res.json({ history: enriched });
  }),
);

/**
 * "Różne" (MiscItem) — drobne dodatki bez własnej ewidencji (patrz komentarz przy
 * modelu w schema.prisma). Celowo płaskie CRUD: brak historii, brak wycofania,
 * usunięcie = trwałe usunięcie wiersza.
 */
employeesRouter.get(
  '/:id/misc-items',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const items = await prisma.miscItem.findMany({ where: { employeeId: id }, orderBy: { createdAt: 'asc' } });
    res.json({ items });
  }),
);

employeesRouter.post(
  '/:id/misc-items',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new AppError(404, 'Nie znaleziono pracownika');
    const { opis } = miscItemCreateSchema.parse(req.body);
    const item = await prisma.miscItem.create({ data: { opis, employeeId: id } });
    res.status(201).json({ item });
  }),
);

employeesRouter.delete(
  '/:id/misc-items/:itemId',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const itemId = Number(req.params.itemId);
    const result = await prisma.miscItem.deleteMany({ where: { id: itemId, employeeId: id } });
    if (result.count === 0) throw new AppError(404, 'Nie znaleziono tej pozycji');
    res.status(204).end();
  }),
);

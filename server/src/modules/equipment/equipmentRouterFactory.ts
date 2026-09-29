import { Router } from 'express';
import type { ZodTypeAny } from 'zod';
import { idParamSchema, assignEquipmentSchema, unassignEquipmentSchema, type EquipmentType } from 'shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { zapiszZmiane } from '../historiaZmian/historiaZmian.service';
import * as assignmentHistoryService from '../assignmentHistory/assignmentHistory.service';
import type { AssignableModelName } from '../assignmentHistory/assignmentHistory.service';

/** Minimalny kontrakt delegata Prisma, jakiego potrzebuje fabryka (podzbiór pełnego API). */
interface EquipmentDelegate {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
}

export interface EquipmentRouterConfig {
  /** Dyskryminator używany w AssignmentHistory / EquipmentListItem. */
  sprzetTyp: EquipmentType;
  delegate: EquipmentDelegate;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** Kolumny przeszukiwane parametrem ?q= na liście. */
  searchFields: string[];
  /**
   * Czy encja ma pole `aktualnyUzytkownikId` (wszystkie typy oprócz drukarki) —
   * steruje dołączeniem endpointów assign/unassign oraz include użytkownika.
   */
  includeUser?: boolean;
  /** Wymagane, gdy includeUser=true — nazwa delegata Prisma używana w transakcji assign/unassign. */
  modelName?: AssignableModelName;
  /** Dodatkowe relacje dołączane do include (np. `pair` dla myszy/klawiatur). */
  extraInclude?: Record<string, unknown>;
  /**
   * Nazwy własnych pól encji filtrowalnych przez proste dopasowanie równości
   * (`?pole=wartosc`), np. `typ`, `ramRodzaj`, `czyZestaw`. Wartość "true"/"false"
   * jest rzutowana na boolean, w przeciwnym razie trafia jako string.
   */
  filterableFields?: string[];
}

/**
 * Generuje kompletny, admin-only router CRUD dla jednego typu sprzętu: listę
 * (z wyszukiwaniem i filtrem wycofany), szczegóły, tworzenie, edycję, archiwizację
 * (soft-delete), historię przypisań oraz — jeśli `includeUser` — assign/unassign.
 *
 * Wzorzec współdzielony przez computers/monitors/mice/keyboards/phones/sim-cards;
 * printery mają własny router (relokacja zamiast assign, brak użytkownika).
 */
export function createEquipmentRouter(config: EquipmentRouterConfig): Router {
  const {
    sprzetTyp,
    delegate,
    createSchema,
    updateSchema,
    searchFields,
    includeUser = true,
    modelName,
    extraInclude,
    filterableFields = [],
  } = config;

  if (includeUser && !modelName) {
    throw new Error(`createEquipmentRouter(${sprzetTyp}): modelName jest wymagane, gdy includeUser=true`);
  }

  const router = Router();
  const userInclude =
    includeUser || extraInclude
      ? { ...(includeUser ? { aktualnyUzytkownik: { include: { dzial: true } } } : {}), ...extraInclude }
      : undefined;

  router.use(requireAuth, requireRole('ADMIN'));

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

      // Filtr statusu jest trójstanowy: brak parametru = wszystkie, 'true'/'false' = tylko
      // nieaktywne/aktywne. Bez tego nie dało się jednocześnie przeglądać obu stanów.
      const where: Record<string, unknown> = {};
      if (req.query.wycofany === 'true') where.wycofany = true;
      else if (req.query.wycofany === 'false') where.wycofany = false;

      if (q) {
        where.OR = searchFields.map((field) => ({ [field]: { contains: q } }));
      }

      if (includeUser) {
        if (req.query.przypisanie === 'assigned') where.aktualnyUzytkownikId = { not: null };
        else if (req.query.przypisanie === 'unassigned') where.aktualnyUzytkownikId = null;

        if (typeof req.query.dzialId === 'string' && req.query.dzialId !== '') {
          where.aktualnyUzytkownik = { dzialId: Number(req.query.dzialId) };
        }
      }

      for (const field of filterableFields) {
        const raw = req.query[field];
        if (typeof raw === 'string' && raw !== '') {
          where[field] = raw === 'true' ? true : raw === 'false' ? false : raw;
        }
      }

      const items = await delegate.findMany({ where, include: userInclude, orderBy: { id: 'asc' } });
      res.json({ items });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const item = await delegate.findUnique({ where: { id }, include: userInclude });
      if (!item) throw new AppError(404, 'Nie znaleziono sprzętu');
      res.json({ item });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const data = createSchema.parse(req.body);
      const item = await delegate.create({ data, include: userInclude });
      await zapiszZmiane({ encja: sprzetTyp, encjaId: item.id, operacja: 'UTWORZENIE', po: item, appUserId: req.user!.id });
      res.status(201).json({ item });
    }),
  );

  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const data = updateSchema.parse(req.body);
      const przed = await delegate.findUnique({ where: { id } });
      const item = await delegate.update({ where: { id }, data, include: userInclude });
      await zapiszZmiane({ encja: sprzetTyp, encjaId: id, operacja: 'EDYCJA', przed, po: item, appUserId: req.user!.id });
      res.json({ item });
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const item = await delegate.update({
        where: { id },
        data: { wycofany: true, dataWycofania: new Date() },
      });
      await zapiszZmiane({ encja: sprzetTyp, encjaId: id, operacja: 'WYCOFANIE', po: item, appUserId: req.user!.id });
      res.json({ item });
    }),
  );

  /** Odwrotność archiwizacji — przywraca sprzęt do statusu aktywnego. */
  router.post(
    '/:id/restore',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const item = await delegate.update({
        where: { id },
        data: { wycofany: false, dataWycofania: null },
        include: userInclude,
      });
      await zapiszZmiane({ encja: sprzetTyp, encjaId: id, operacja: 'PRZYWROCENIE', po: item, appUserId: req.user!.id });
      res.json({ item });
    }),
  );

  router.get(
    '/:id/history',
    asyncHandler(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const history = await assignmentHistoryService.getHistory(sprzetTyp, id);
      res.json({ history });
    }),
  );

  if (includeUser) {
    router.post(
      '/:id/assign',
      asyncHandler(async (req, res) => {
        const { id } = idParamSchema.parse(req.params);
        const { employeeId, notatka } = assignEquipmentSchema.parse(req.body);
        const item = await assignmentHistoryService.assign({
          sprzetTyp,
          sprzetId: id,
          employeeId,
          notatka,
          actorAppUserId: req.user!.id,
          modelName: modelName!,
        });
        res.json({ item });
      }),
    );

    router.post(
      '/:id/unassign',
      asyncHandler(async (req, res) => {
        const { id } = idParamSchema.parse(req.params);
        const { notatka } = unassignEquipmentSchema.parse(req.body);
        const item = await assignmentHistoryService.unassign({
          sprzetTyp,
          sprzetId: id,
          notatka,
          actorAppUserId: req.user!.id,
          modelName: modelName!,
        });
        res.json({ item });
      }),
    );
  }

  return router;
}

import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import PdfPrinter from 'pdfmake';
import {
  idParamSchema,
  inwentaryzacjaCreateSchema,
  inwentaryzacjaPotwierdzSchema,
  sprzetZEtykietaSchema,
  TYPY_Z_ETYKIETA,
} from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { fontDescriptors } from '../../pdf/fonts';
import { buildRaportInwentaryzacjiDocDefinition } from '../../pdf/raportInwentaryzacji';
import { getEquipmentDelegate } from '../equipment/equipmentLookup';
import { listaSprzetuZEtykieta, type SprzetZEtykieta } from '../equipment/sprzetZEtykieta';

/** Spis z natury: lista oczekiwanego sprzętu + potwierdzenia (skan naklejki QR albo ręcznie). */
export const inwentaryzacjeRouter = Router();

inwentaryzacjeRouter.use(requireAuth, requireRole('ADMIN'));

const pozycjaInclude = { potwierdzilAppUser: { select: { id: true, login: true } } } as const;

/** Postęp liczony po pozycjach z listy startowej; znalezione spoza listy osobno. */
async function podsumowania(ids: number[]) {
  const grupuj = (where: Prisma.InwentaryzacjaPozycjaWhereInput) =>
    prisma.inwentaryzacjaPozycja.groupBy({ by: ['inwentaryzacjaId'], where: { inwentaryzacjaId: { in: ids }, ...where }, _count: true });
  const [zListy, potwierdzone, spozaListy] = await Promise.all([
    grupuj({ spozaListy: false }),
    grupuj({ spozaListy: false, potwierdzonoAt: { not: null } }),
    grupuj({ spozaListy: true }),
  ]);
  const licz = (lista: { inwentaryzacjaId: number; _count: number }[], id: number) =>
    lista.find((x) => x.inwentaryzacjaId === id)?._count ?? 0;
  return (id: number) => ({
    liczbaPozycji: licz(zListy, id),
    liczbaPotwierdzonych: licz(potwierdzone, id),
    liczbaSpozaListy: licz(spozaListy, id),
  });
}

async function pobierzOtwarta(id: number) {
  const inwentaryzacja = await prisma.inwentaryzacja.findUnique({ where: { id } });
  if (!inwentaryzacja) throw new AppError(404, 'Nie znaleziono inwentaryzacji');
  if (inwentaryzacja.status !== 'OTWARTA') throw new AppError(409, 'Ta inwentaryzacja jest już zamknięta');
  return inwentaryzacja;
}

/** Migawka pozycji z chwili rozpoczęcia — raport pokaże, gdzie sprzęt powinien był być. */
function migawka(s: SprzetZEtykieta) {
  return {
    sprzetTyp: s.sprzetTyp,
    sprzetId: s.sprzetId,
    identyfikator: s.identyfikator,
    opis: s.opis,
    uzytkownik: s.uzytkownik,
    dzial: s.dzial,
  };
}

inwentaryzacjeRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const lista = await prisma.inwentaryzacja.findMany({
      include: { dzial: true, utworzylAppUser: { select: { id: true, login: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const liczniki = await podsumowania(lista.map((i) => i.id));
    res.json({ items: lista.map((i) => ({ ...i, ...liczniki(i.id) })) });
  }),
);

/**
 * Wyszukanie sprzętu po numerze ewidencyjnym — strona otwierana skanem naklejki QR.
 * Zwraca też otwarte inwentaryzacje i stan tej sztuki w każdej z nich (do przycisku „Potwierdź”).
 */
inwentaryzacjeRouter.get(
  '/skan/:numer',
  asyncHandler(async (req, res) => {
    const numer = req.params.numer.trim(); // Express dekoduje parametry ścieżki sam
    const trafienia = (
      await Promise.all(
        TYPY_Z_ETYKIETA.map(async (sprzetTyp) => {
          // Bez rozróżniania wielkości liter (naklejka mogła zostać przepisana ręcznie).
          const wiersze: { id: number; numerEwidencyjny: string }[] = await getEquipmentDelegate(sprzetTyp).findMany({
            select: { id: true, numerEwidencyjny: true },
          });
          return wiersze
            .filter((w) => w.numerEwidencyjny.toUpperCase() === numer.toUpperCase())
            .map((w) => ({ sprzetTyp, sprzetId: w.id }));
        }),
      )
    ).flat();
    const sprzet = trafienia.length ? await listaSprzetuZEtykieta({ pozycje: trafienia }) : [];

    const otwarte = await prisma.inwentaryzacja.findMany({
      where: { status: 'OTWARTA' },
      include: {
        dzial: true,
        pozycje: { where: { OR: trafienia.length ? trafienia : [{ id: -1 }] }, include: pozycjaInclude },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      items: sprzet.map((s) => ({
        ...s,
        inwentaryzacje: otwarte.map((i) => ({
          id: i.id,
          nazwa: i.nazwa,
          dzial: i.dzial?.nazwa ?? null,
          pozycja: i.pozycje.find((p) => p.sprzetTyp === s.sprzetTyp && p.sprzetId === s.sprzetId) ?? null,
        })),
      })),
    });
  }),
);

inwentaryzacjeRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { nazwa, dzialId } = inwentaryzacjaCreateSchema.parse(req.body);
    if (dzialId) {
      const dzial = await prisma.department.findUnique({ where: { id: dzialId } });
      if (!dzial) throw new AppError(404, 'Nie znaleziono działu');
    }
    const oczekiwane = await listaSprzetuZEtykieta({ dzialId: dzialId ?? undefined });
    const utworzona = await prisma.inwentaryzacja.create({
      data: {
        nazwa,
        dzialId: dzialId ?? null,
        utworzylAppUserId: req.user!.id,
        pozycje: { create: oczekiwane.map(migawka) },
      },
    });
    res.status(201).json({ item: { ...utworzona, liczbaPozycji: oczekiwane.length, liczbaPotwierdzonych: 0, liczbaSpozaListy: 0 } });
  }),
);

inwentaryzacjeRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const inwentaryzacja = await prisma.inwentaryzacja.findUnique({
      where: { id },
      include: {
        dzial: true,
        utworzylAppUser: { select: { id: true, login: true } },
        pozycje: { include: pozycjaInclude, orderBy: [{ dzial: 'asc' }, { sprzetTyp: 'asc' }, { identyfikator: 'asc' }] },
      },
    });
    if (!inwentaryzacja) throw new AppError(404, 'Nie znaleziono inwentaryzacji');
    res.json({ item: inwentaryzacja });
  }),
);

inwentaryzacjeRouter.post(
  '/:id/pozycje/:pozycjaId/potwierdz',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { uwagi } = inwentaryzacjaPotwierdzSchema.parse(req.body ?? {});
    await pobierzOtwarta(id);
    const pozycja = await prisma.inwentaryzacjaPozycja.findFirst({ where: { id: Number(req.params.pozycjaId), inwentaryzacjaId: id } });
    if (!pozycja) throw new AppError(404, 'Nie ma tej pozycji w inwentaryzacji');
    const zaktualizowana = await prisma.inwentaryzacjaPozycja.update({
      where: { id: pozycja.id },
      // Ponowne potwierdzenie (np. drugi skan) nie przesuwa pierwotnej daty ani osoby.
      data: pozycja.potwierdzonoAt
        ? { uwagi: uwagi?.trim() || pozycja.uwagi }
        : { potwierdzonoAt: new Date(), potwierdzilAppUserId: req.user!.id, uwagi: uwagi?.trim() || null },
      include: pozycjaInclude,
    });
    res.json({ item: zaktualizowana });
  }),
);

inwentaryzacjeRouter.post(
  '/:id/pozycje/:pozycjaId/cofnij',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await pobierzOtwarta(id);
    const pozycja = await prisma.inwentaryzacjaPozycja.findFirst({ where: { id: Number(req.params.pozycjaId), inwentaryzacjaId: id } });
    if (!pozycja) throw new AppError(404, 'Nie ma tej pozycji w inwentaryzacji');
    // Pozycja spoza listy istnieje tylko dzięki potwierdzeniu — cofnięcie ją usuwa.
    if (pozycja.spozaListy) {
      await prisma.inwentaryzacjaPozycja.delete({ where: { id: pozycja.id } });
      res.status(204).end();
      return;
    }
    const zaktualizowana = await prisma.inwentaryzacjaPozycja.update({
      where: { id: pozycja.id },
      data: { potwierdzonoAt: null, potwierdzilAppUserId: null, uwagi: null },
      include: pozycjaInclude,
    });
    res.json({ item: zaktualizowana });
  }),
);

/** Sprzęt znaleziony podczas spisu, którego nie było na liście (np. z innego działu). */
inwentaryzacjeRouter.post(
  '/:id/znaleziony',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const ref = sprzetZEtykietaSchema.parse(req.body);
    await pobierzOtwarta(id);
    const [sprzet] = await listaSprzetuZEtykieta({ pozycje: [ref] });
    if (!sprzet) throw new AppError(404, 'Nie znaleziono sprzętu');
    const istniejaca = await prisma.inwentaryzacjaPozycja.findUnique({
      where: { inwentaryzacjaId_sprzetTyp_sprzetId: { inwentaryzacjaId: id, sprzetTyp: ref.sprzetTyp, sprzetId: ref.sprzetId } },
    });
    if (istniejaca) throw new AppError(409, 'Ten sprzęt już jest w inwentaryzacji');
    const pozycja = await prisma.inwentaryzacjaPozycja.create({
      data: {
        inwentaryzacjaId: id,
        ...migawka(sprzet),
        spozaListy: true,
        potwierdzonoAt: new Date(),
        potwierdzilAppUserId: req.user!.id,
      },
      include: pozycjaInclude,
    });
    res.status(201).json({ item: pozycja });
  }),
);

inwentaryzacjeRouter.post(
  '/:id/zamknij',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await pobierzOtwarta(id);
    const item = await prisma.inwentaryzacja.update({ where: { id }, data: { status: 'ZAMKNIETA', zamknietaAt: new Date() } });
    res.json({ item });
  }),
);

inwentaryzacjeRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.inwentaryzacja.delete({ where: { id } }); // pozycje kasowane kaskadowo
    res.status(204).end();
  }),
);

inwentaryzacjeRouter.get(
  '/:id/raport',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const inwentaryzacja = await prisma.inwentaryzacja.findUnique({
      where: { id },
      include: {
        dzial: true,
        pozycje: { include: pozycjaInclude, orderBy: [{ dzial: 'asc' }, { sprzetTyp: 'asc' }, { identyfikator: 'asc' }] },
      },
    });
    if (!inwentaryzacja) throw new AppError(404, 'Nie znaleziono inwentaryzacji');
    const pdf = new PdfPrinter(fontDescriptors).createPdfKitDocument(buildRaportInwentaryzacjiDocDefinition(inwentaryzacja));
    const nazwa = inwentaryzacja.nazwa.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[łŁ]/g, 'l').replace(/[^A-Za-z0-9-]+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="raport-${nazwa}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }),
);

import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  daneOdczytuSchema,
  idParamSchema,
  odczytDopasujSchema,
  odczytKodCreateSchema,
  odczytUtworzKomputerSchema,
  odczytZastosujSchema,
  STATUSY_ODCZYTU,
  type StatusOdczytu,
} from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { wygenerujKod } from '../../utils/kodDostepu';
import { zapiszZmiane } from '../historiaZmian/historiaZmian.service';
import { adresApi } from '../onboarding/adresApi';
import { mapujOdczyt } from './mapowanie';
import { daneZapisane, listaPominietych, polaRozne, zapiszOdczyt } from './odczyty.service';
import { generujSkryptOdczytu } from './skryptOdczytu';

export const odczytyRouter = Router();

odczytyRouter.use(requireAuth, requireRole('ADMIN'));

/** Kod odczytu jest wielokrotnego użytku (obchód wielu komputerów), więc ważny dłużej
 *  niż kod onboardingu — i tak niczego nie zapisuje w ewidencji bez przeglądu. */
const WAZNOSC_KODU_MS = 7 * 24 * 60 * 60 * 1000;

const kodInclude = {
  computer: { select: { id: true, numerEwidencyjny: true } },
  _count: { select: { odczyty: true } },
} as const;

type KodZRelacjami = Prisma.OdczytKodGetPayload<{ include: typeof kodInclude }>;

function serializujKod({ _count, ...kod }: KodZRelacjami) {
  return { ...kod, liczbaOdczytow: _count.odczyty, wygasl: kod.wygasaAt.getTime() < Date.now() };
}

const odczytInclude = {
  computer: { select: { id: true, numerEwidencyjny: true, markaModel: true, wycofany: true } },
  rozpatrzylAppUser: { select: { id: true, login: true } },
} as const;

type OdczytZRelacjami = Prisma.OdczytSprzetuGetPayload<{ include: typeof odczytInclude }>;

function serializujOdczyt({ dane, ...odczyt }: OdczytZRelacjami) {
  let markaModel: string | null = null;
  try {
    markaModel = mapujOdczyt(daneZapisane(dane)).propozycja.markaModel ?? null;
  } catch {
    // uszkodzony JSON nie może zablokować listy
  }
  return {
    ...odczyt,
    markaModel,
    pominietePola: listaPominietych(odczyt.pominietePola),
    // ODRZUCONY bez osoby = system zastąpił go nowszym odczytem tego samego komputera.
    zastapiony: odczyt.status === 'ODRZUCONY' && odczyt.rozpatrzylAppUserId === null,
  };
}

async function pobierzOdczyt(id: number) {
  const odczyt = await prisma.odczytSprzetu.findUnique({ where: { id }, include: odczytInclude });
  if (!odczyt) throw new AppError(404, 'Nie znaleziono odczytu');
  return odczyt;
}

/** `?computerId=` z zapytania — liczba albo brak (zły format = 400, nie błąd Prismy). */
const computerIdZapytania = z.coerce.number().int().positive().optional();

function wymagajNowego(odczyt: { status: string }) {
  if (odczyt.status !== 'NOWY') throw new AppError(409, 'Ten odczyt został już rozpatrzony');
}

// ---------------------------------------------------------------------------
// Kody do jednolinijkowca
// ---------------------------------------------------------------------------

/** Aktywne kody: ogólne (bez parametru) albo przypięte do wskazanego komputera. */
odczytyRouter.get(
  '/kody',
  asyncHandler(async (req, res) => {
    const computerId = computerIdZapytania.parse(req.query.computerId) ?? null;
    const kody = await prisma.odczytKod.findMany({
      where: { computerId, wygasaAt: { gt: new Date() } },
      include: kodInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: kody.map(serializujKod) });
  }),
);

odczytyRouter.post(
  '/kody',
  asyncHandler(async (req, res) => {
    const { computerId } = odczytKodCreateSchema.parse(req.body);
    if (computerId) {
      const komputer = await prisma.computer.findUnique({ where: { id: computerId } });
      if (!komputer) throw new AppError(404, 'Nie znaleziono komputera');
    }
    let kod = wygenerujKod();
    while (await prisma.odczytKod.findUnique({ where: { kod } })) kod = wygenerujKod();
    const utworzony = await prisma.odczytKod.create({
      data: {
        kod,
        computerId: computerId ?? null,
        wygasaAt: new Date(Date.now() + WAZNOSC_KODU_MS),
        utworzylAppUserId: req.user!.id,
      },
      include: kodInclude,
    });
    res.status(201).json({ item: serializujKod(utworzony) });
  }),
);

/** Unieważnienie kodu (np. wyciekł) — skrócenie ważności zamiast usuwania, żeby zostały powiązania z odczytami. */
odczytyRouter.delete(
  '/kody/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.odczytKod.update({ where: { id }, data: { wygasaAt: new Date() } });
    res.status(204).end();
  }),
);

/** Skrypt jako plik (np. na pendrive) — z BOM, bo PowerShell 5.1 czyta .ps1 bez BOM jako ANSI. */
odczytyRouter.get(
  '/kody/:id/skrypt',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const kod = await prisma.odczytKod.findUnique({ where: { id }, include: kodInclude });
    if (!kod) throw new AppError(404, 'Nie znaleziono kodu odczytu');
    const skrypt = generujSkryptOdczytu({
      kod: kod.kod,
      adresSerwera: adresApi(req),
      komputer: kod.computer?.numerEwidencyjny ?? null,
      wygenerowano: new Date(),
    });
    const nazwa = kod.computer ? `odczyt-${kod.computer.numerEwidencyjny}` : `odczyt-${kod.kod}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nazwa.replace(/[^A-Za-z0-9._-]/g, '_')}.ps1"`);
    res.send(`\uFEFF${skrypt}`);
  }),
);

// ---------------------------------------------------------------------------
// Odczyt cykliczny — tokeny zadań na komputerach
// ---------------------------------------------------------------------------

odczytyRouter.get(
  '/agenci',
  asyncHandler(async (req, res) => {
    const computerId = computerIdZapytania.parse(req.query.computerId);
    const agenci = await prisma.odczytAgent.findMany({
      where: computerId ? { computerId } : {},
      select: { id: true, computerId: true, aktywny: true, createdAt: true, ostatnioAt: true, hostname: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: agenci });
  }),
);

/** Wyłączenie tokenu: kolejne odczyty z tego komputera będą odrzucane (zadanie może zostać). */
odczytyRouter.post(
  '/agenci/:id/wylacz',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.odczytAgent.update({ where: { id }, data: { aktywny: false } });
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Odczyty
// ---------------------------------------------------------------------------

odczytyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const where: Prisma.OdczytSprzetuWhereInput = {};
    const status = req.query.status;
    if (typeof status === 'string' && (STATUSY_ODCZYTU as readonly string[]).includes(status)) {
      where.status = status as StatusOdczytu;
    }
    const computerId = computerIdZapytania.parse(req.query.computerId);
    if (computerId) where.computerId = computerId;
    const odczyty = await prisma.odczytSprzetu.findMany({
      where,
      include: odczytInclude,
      orderBy: { otrzymanoAt: 'desc' },
      take: 200,
    });
    res.json({ items: odczyty.map(serializujOdczyt) });
  }),
);

/** Plik JSON zapisany przez skrypt, gdy komputer nie miał połączenia z serwerem. */
odczytyRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const dane = daneOdczytuSchema.parse(req.body);
    const { odczyt } = await zapiszOdczyt({ dane, zrodlo: 'PLIK' });
    res.status(201).json({ item: serializujOdczyt(await pobierzOdczyt(odczyt.id)) });
  }),
);

odczytyRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const odczyt = await pobierzOdczyt(id);
    const dane = daneZapisane(odczyt.dane);
    const { propozycja, uwagi } = mapujOdczyt(dane);
    const komputer = odczyt.computerId ? await prisma.computer.findUnique({ where: { id: odczyt.computerId } }) : null;
    res.json({ item: { ...serializujOdczyt(odczyt), dane, propozycja, uwagi, komputer } });
  }),
);

odczytyRouter.post(
  '/:id/dopasuj',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { computerId } = odczytDopasujSchema.parse(req.body);
    wymagajNowego(await pobierzOdczyt(id));
    const komputer = await prisma.computer.findUnique({ where: { id: computerId } });
    if (!komputer) throw new AppError(404, 'Nie znaleziono komputera');
    await prisma.odczytSprzetu.update({ where: { id }, data: { computerId, dopasowanie: 'RECZNIE' } });
    res.json({ item: serializujOdczyt(await pobierzOdczyt(id)) });
  }),
);

/** Przepisuje wybrane (i ewentualnie poprawione przez admina) pola do dopasowanego komputera.
 *  Pusta lista pól = „wszystko się zgadza” — odczyt zostaje tylko oznaczony jako przejrzany. */
odczytyRouter.post(
  '/:id/zastosuj',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { pola } = odczytZastosujSchema.parse(req.body);
    const odczyt = await pobierzOdczyt(id);
    wymagajNowego(odczyt);
    if (!odczyt.computerId) {
      throw new AppError(400, 'Odczyt nie jest powiązany z komputerem — wskaż komputer albo utwórz nowy');
    }
    const computerId = odczyt.computerId;
    const { propozycja } = mapujOdczyt(daneZapisane(odczyt.dane));
    await prisma.$transaction(async (tx) => {
      const przed = await tx.computer.findUnique({ where: { id: computerId } });
      const po = await tx.computer.update({ where: { id: computerId }, data: pola });
      await tx.odczytSprzetu.update({
        where: { id },
        data: {
          status: 'ZASTOSOWANY',
          rozpatrzonoAt: new Date(),
          rozpatrzylAppUserId: req.user!.id,
          pominietePola: JSON.stringify(polaRozne(propozycja, po)),
        },
      });
      await zapiszZmiane({
        klient: tx,
        encja: 'KOMPUTER',
        encjaId: computerId,
        operacja: 'EDYCJA',
        przed,
        po,
        appUserId: req.user!.id,
        kontekst: `odczyt sprzętu #${id}`,
      });
    });
    res.json({ item: serializujOdczyt(await pobierzOdczyt(id)) });
  }),
);

odczytyRouter.post(
  '/:id/utworz-komputer',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { komputer } = odczytUtworzKomputerSchema.parse(req.body);
    const odczyt = await pobierzOdczyt(id);
    wymagajNowego(odczyt);
    const { propozycja } = mapujOdczyt(daneZapisane(odczyt.dane));
    const zajety = await prisma.computer.findUnique({ where: { numerEwidencyjny: komputer.numerEwidencyjny } });
    if (zajety) throw new AppError(409, `Komputer o numerze ewidencyjnym ${komputer.numerEwidencyjny} już istnieje`);
    const utworzony = await prisma.$transaction(async (tx) => {
      const nowy = await tx.computer.create({ data: komputer });
      await zapiszZmiane({
        klient: tx,
        encja: 'KOMPUTER',
        encjaId: nowy.id,
        operacja: 'UTWORZENIE',
        po: nowy,
        appUserId: req.user!.id,
        kontekst: `odczyt sprzętu #${id}`,
      });
      await tx.odczytSprzetu.update({
        where: { id },
        data: {
          computerId: nowy.id,
          dopasowanie: 'UTWORZONY',
          status: 'ZASTOSOWANY',
          rozpatrzonoAt: new Date(),
          rozpatrzylAppUserId: req.user!.id,
          pominietePola: JSON.stringify(polaRozne(propozycja, nowy)),
        },
      });
      return nowy;
    });
    res.status(201).json({ item: utworzony });
  }),
);

odczytyRouter.post(
  '/:id/odrzuc',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    wymagajNowego(await pobierzOdczyt(id));
    await prisma.odczytSprzetu.update({
      where: { id },
      data: { status: 'ODRZUCONY', rozpatrzonoAt: new Date(), rozpatrzylAppUserId: req.user!.id },
    });
    res.json({ item: serializujOdczyt(await pobierzOdczyt(id)) });
  }),
);

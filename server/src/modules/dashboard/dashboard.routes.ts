import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireRole('ADMIN'));

const LOW_TONER_THRESHOLD = 2;
const SIM_CONTRACT_WARNING_DAYS = 30;

dashboardRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const activeFilter = { wycofany: false };

    const [
      computers,
      monitors,
      mice,
      keyboards,
      phones,
      simCards,
      printers,
      employees,
      appUsers,
      equipmentLists,
      lowToners,
      expiringSimCards,
      odczytyDoPrzejrzenia,
      otwarteInwentaryzacje,
    ] = await Promise.all([
      prisma.computer.count({ where: activeFilter }),
      prisma.monitor.count({ where: activeFilter }),
      prisma.mouse.count({ where: activeFilter }),
      prisma.keyboard.count({ where: activeFilter }),
      prisma.phone.count({ where: activeFilter }),
      prisma.simCard.count({ where: activeFilter }),
      prisma.printer.count({ where: activeFilter }),
      prisma.employee.count({ where: { aktywny: true } }),
      prisma.appUser.count({ where: { aktywny: true } }),
      prisma.equipmentList.count(),
      prisma.toner.findMany({ where: { ilosc: { lte: LOW_TONER_THRESHOLD } }, orderBy: { ilosc: 'asc' } }),
      prisma.simCard.findMany({
        where: {
          wycofany: false,
          dataKoncaUmowy: {
            lte: new Date(Date.now() + SIM_CONTRACT_WARNING_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { dataKoncaUmowy: 'asc' },
        select: { id: true, numerTelefonu: true, iccid: true, dataKoncaUmowy: true },
      }),
      prisma.odczytSprzetu.count({ where: { status: 'NOWY' } }),
      prisma.inwentaryzacja.findMany({
        where: { status: 'OTWARTA' },
        select: { id: true, nazwa: true, pozycje: { select: { spozaListy: true, potwierdzonoAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Postęp liczony po liście startowej — znalezione spoza listy go nie zawyżają.
    const inwentaryzacjeWToku = otwarteInwentaryzacje.map(({ pozycje, ...inw }) => {
      const zListy = pozycje.filter((p) => !p.spozaListy);
      return { ...inw, liczbaPozycji: zListy.length, liczbaPotwierdzonych: zListy.filter((p) => p.potwierdzonoAt).length };
    });

    res.json({
      counts: { computers, monitors, mice, keyboards, phones, simCards, printers, employees, appUsers, equipmentLists },
      alerts: { lowToners, expiringSimCards, odczytyDoPrzejrzenia, inwentaryzacjeWToku },
    });
  }),
);

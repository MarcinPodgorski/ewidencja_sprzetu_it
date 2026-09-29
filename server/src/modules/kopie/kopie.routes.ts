import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { strumienTar } from '../../utils/tar';
import { listaKopii, sciezkaKopii, stanKopii, utworzKopie } from './kopie.service';

/** Kopie zapasowe — tylko admin (zawierają całą bazę: także PIN-y kart SIM i skróty haseł). */
export const kopieRouter = Router();

kopieRouter.use(requireAuth, requireRole('ADMIN'));

kopieRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ stan: await stanKopii(), items: await listaKopii() });
  }),
);

kopieRouter.post(
  '/',
  asyncHandler(async (_req, res) => {
    res.status(201).json({ item: await utworzKopie('RECZNA') });
  }),
);

async function wymagajKopii(nazwa: string): Promise<string> {
  const katalog = sciezkaKopii(nazwa);
  if (!fs.existsSync(path.join(katalog, 'kopia.json'))) throw new AppError(404, 'Nie znaleziono kopii');
  return katalog;
}

/** Sama baza (mały plik — np. do szybkiego podejrzenia albo przeniesienia). */
kopieRouter.get(
  '/:nazwa/baza',
  asyncHandler(async (req, res) => {
    const katalog = await wymagajKopii(req.params.nazwa);
    res.download(path.join(katalog, 'baza.db'), `sprzet-it-baza-${req.params.nazwa}.db`);
  }),
);

/** Całość (baza + załączniki + instalatory) jako .tar.gz, pakowana w locie. */
kopieRouter.get(
  '/:nazwa/calosc',
  asyncHandler(async (req, res) => {
    const katalog = await wymagajKopii(req.params.nazwa);
    const nazwa = `sprzet-it-kopia-${req.params.nazwa}`;
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${nazwa}.tar.gz"`);
    const gzip = zlib.createGzip();
    const tar = strumienTar(katalog, nazwa);
    tar.on('error', (err) => {
      console.error('[kopie] błąd pakowania kopii:', err);
      res.destroy(err);
    });
    tar.pipe(gzip).pipe(res);
  }),
);

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { INSTALATOR_ROZSZERZENIA, idParamSchema, oprogramowanieCreateSchema, oprogramowanieUpdateSchema } from 'shared';
import { INSTALATORY_DIR } from '../../config/uploads';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';

/** Katalog programów instalowanych przez skrypt onboardingu: pakiety winget i wgrane
 *  pliki instalacyjne. POST/PUT przyjmują JSON albo multipart (pole `plik`). */
export const oprogramowanieRouter = Router();

oprogramowanieRouter.use(requireAuth, requireRole('ADMIN'));

// ---------------------------------------------------------------------------
// Upload instalatora
// ---------------------------------------------------------------------------

const LIMIT_ROZMIARU = 1024 * 1024 * 1024; // 1 GB — pełne instalatory offline bywają duże

/** Busboy (pod multerem) dekoduje nazwę pliku jako latin1 — „żółć.exe” przychodzi jako
 *  „Å¼Ã³Å\x82Ä\x87.exe”. Odwracamy to tylko, gdy nazwa wygląda na bajty UTF-8 czytane jako latin1. */
function naprawKodowanieNazwy(nazwa: string): string {
  if (![...nazwa].every((znak) => znak.charCodeAt(0) <= 0xff)) return nazwa;
  const zdekodowana = Buffer.from(nazwa, 'latin1').toString('utf8');
  return zdekodowana.includes('\uFFFD') ? nazwa : zdekodowana;
}

/** Nazwa, pod którą plik trafi na laptopa: bez ścieżek i znaków zakazanych w Windowsie. */
function bezpiecznaNazwaPliku(nazwa: string): string {
  const bazowa = path.basename(naprawKodowanieNazwy(nazwa).replace(/\\/g, '/'));
  const ZAKAZANE = '<>:"/\\|?*';
  const oczyszczona = [...bazowa]
    .map((znak) => (znak.charCodeAt(0) < 32 || ZAKAZANE.includes(znak) ? '_' : znak))
    .join('')
    .replace(/[. ]+$/, '')
    .trim();
  const rozszerzenie = path.extname(oczyszczona);
  return rozszerzenie.length > 0 && oczyszczona.length > 120
    ? oczyszczona.slice(0, 120 - rozszerzenie.length) + rozszerzenie
    : oczyszczona || 'instalator';
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, INSTALATORY_DIR),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(bezpiecznaNazwaPliku(file.originalname)).toLowerCase()}`),
  }),
  limits: { fileSize: LIMIT_ROZMIARU, files: 1 },
  fileFilter: (_req, file, cb) => {
    const rozszerzenie = path.extname(bezpiecznaNazwaPliku(file.originalname)).toLowerCase();
    if (file.fieldname !== 'plik') return cb(new AppError(400, `Nieoczekiwane pole pliku: ${file.fieldname}`));
    if (!(INSTALATOR_ROZSZERZENIA as readonly string[]).includes(rozszerzenie)) {
      return cb(new AppError(400, `Obsługiwane instalatory: ${INSTALATOR_ROZSZERZENIA.join(', ')}`));
    }
    cb(null, true);
  },
});

/** multer pomija żądania inne niż multipart — te same trasy obsługują więc też zwykły JSON. */
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('plik')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Plik jest za duży (limit 1 GB)' : err.message));
    }
    next(err);
  });
}

async function sha256Pliku(sciezka: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  for await (const fragment of fs.createReadStream(sciezka)) hash.update(fragment as Buffer);
  return hash.digest('hex').toUpperCase(); // wielkie litery — tak zwraca Get-FileHash
}

async function usunPlik(nazwa: string | null | undefined) {
  if (nazwa) await fs.promises.unlink(path.join(INSTALATORY_DIR, nazwa)).catch(() => {});
}

/** Dane pliku z właśnie wgranego uploadu — do zapisania w rekordzie katalogu. */
async function daneWgranegoPliku(file: Express.Multer.File) {
  return {
    plik: file.filename,
    plikNazwa: bezpiecznaNazwaPliku(file.originalname),
    plikRozmiar: file.size,
    plikSha256: await sha256Pliku(file.path),
  };
}

/** Nazwa pliku na dysku to szczegół implementacyjny — klient jej nie potrzebuje. */
function serialize<T extends { plik: string | null }>(program: T) {
  const { plik, ...reszta } = program;
  return { ...reszta, maPlik: plik !== null };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

oprogramowanieRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.oprogramowanie.findMany({ orderBy: { nazwa: 'asc' } });
    res.json({ items: items.map(serialize) });
  }),
);

oprogramowanieRouter.post(
  '/',
  handleUpload,
  asyncHandler(async (req, res) => {
    try {
      const data = oprogramowanieCreateSchema.parse(req.body);
      if (data.zrodlo === 'WINGET') {
        if (req.file) throw new AppError(400, 'Program z winget nie przyjmuje pliku');
        const item = await prisma.oprogramowanie.create({ data });
        res.status(201).json({ item: serialize(item) });
        return;
      }
      if (!req.file) throw new AppError(400, 'Wybierz plik instalacyjny');
      const item = await prisma.oprogramowanie.create({ data: { ...data, ...(await daneWgranegoPliku(req.file)) } });
      res.status(201).json({ item: serialize(item) });
    } catch (err) {
      await usunPlik(req.file?.filename);
      throw err;
    }
  }),
);

oprogramowanieRouter.put(
  '/:id',
  handleUpload,
  asyncHandler(async (req, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const istniejacy = await prisma.oprogramowanie.findUnique({ where: { id } });
      if (!istniejacy) throw new AppError(404, 'Nie znaleziono programu');
      const data = oprogramowanieUpdateSchema.parse(req.body);

      if (istniejacy.zrodlo === 'WINGET') {
        if (req.file) throw new AppError(400, 'Program z winget nie przyjmuje pliku');
        const item = await prisma.oprogramowanie.update({
          where: { id },
          data: { nazwa: data.nazwa, wingetId: data.wingetId, opis: data.opis },
        });
        res.json({ item: serialize(item) });
        return;
      }

      const nowyPlik = req.file ? await daneWgranegoPliku(req.file) : {};
      const item = await prisma.oprogramowanie.update({
        where: { id },
        data: { nazwa: data.nazwa, argumenty: data.argumenty, opis: data.opis, ...nowyPlik },
      });
      // Stary plik usuwamy dopiero po udanym zapisie. Skrypty wygenerowane wcześniej
      // mają w migawce sumę starego pliku — wykryją podmianę i odmówią instalacji.
      if (req.file) await usunPlik(istniejacy.plik);
      res.json({ item: serialize(item) });
    } catch (err) {
      await usunPlik(req.file?.filename);
      throw err;
    }
  }),
);

oprogramowanieRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const program = await prisma.oprogramowanie.findUnique({ where: { id } });
    if (!program) throw new AppError(404, 'Nie znaleziono programu');
    await prisma.oprogramowanie.delete({ where: { id } }); // pozycje profili znikają kaskadowo
    await usunPlik(program.plik);
    res.status(204).end();
  }),
);

/** Pobranie instalatora przez admina — np. żeby położyć go na pendrivie obok skryptu. */
oprogramowanieRouter.get(
  '/:id/plik',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const program = await prisma.oprogramowanie.findUnique({ where: { id } });
    if (!program?.plik || !program.plikNazwa) throw new AppError(404, 'Ten program nie ma pliku instalacyjnego');
    res.download(path.join(INSTALATORY_DIR, program.plik), program.plikNazwa);
  }),
);

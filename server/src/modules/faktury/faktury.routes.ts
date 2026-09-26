import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { fakturaCreateSchema, fakturaUpdateSchema, idParamSchema, type EquipmentType } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { UPLOADS_DIR } from '../../config/uploads';
import { getEquipmentSummary } from '../equipment/equipmentLookup';

export const fakturyRouter = Router();

fakturyRouter.use(requireAuth, requireRole('ADMIN'));

// ---------------------------------------------------------------------------
// Upload załączników (PDF/XML) — multer zapisuje bezpośrednio na dysk pod
// losową nazwą (niezależną od id faktury, które w momencie uploadu jeszcze
// nie istnieje przy tworzeniu), fileFilter pilnuje zgodności pola z typem pliku.
// ---------------------------------------------------------------------------

const FILE_SPECS: Record<'plikPdf' | 'plikXml', { ext: string; mimes: string[] }> = {
  plikPdf: { ext: '.pdf', mimes: ['application/pdf'] },
  plikXml: { ext: '.xml', mimes: ['application/xml', 'text/xml'] },
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const spec = FILE_SPECS[file.fieldname as keyof typeof FILE_SPECS];
    cb(null, `${crypto.randomUUID()}${spec?.ext ?? ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const spec = FILE_SPECS[file.fieldname as keyof typeof FILE_SPECS];
    if (!spec) return cb(new AppError(400, `Nieoczekiwane pole pliku: ${file.fieldname}`));
    if (!spec.mimes.includes(file.mimetype)) {
      return cb(new AppError(400, `Plik pola "${file.fieldname}" musi być typu ${spec.mimes.join(' lub ')}`));
    }
    cb(null, true);
  },
});

/** Owija `upload.fields` tak, by błędy multera (w tym limit rozmiaru) trafiały do
 *  wspólnego errorHandlera zamiast crashować bez odpowiedzi. */
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.fields([
    { name: 'plikPdf', maxCount: 1 },
    { name: 'plikXml', maxCount: 1 },
  ])(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Plik jest za duży (limit 15 MB)' : err.message;
      return next(new AppError(400, message));
    }
    next(err);
  });
}

function uploadedFiles(req: Request): Record<string, Express.Multer.File[]> {
  return (req.files as Record<string, Express.Multer.File[]>) ?? {};
}

async function cleanupFiles(filenames: (string | null | undefined)[]) {
  await Promise.all(
    filenames
      .filter((f): f is string => Boolean(f))
      .map((name) => fs.promises.unlink(path.join(UPLOADS_DIR, name)).catch(() => {})),
  );
}

/** `pozycje` przychodzi w multipart body jako string JSON (pole tekstowe obok plików). */
function parseMultipartBody(raw: Record<string, unknown>): Record<string, unknown> {
  const pozycje = raw.pozycje;
  if (typeof pozycje !== 'string') return raw;
  try {
    return { ...raw, pozycje: JSON.parse(pozycje) };
  } catch {
    throw new AppError(400, 'Nieprawidłowy format pozycji faktury');
  }
}

async function resolvePozycje(pozycje: { id: number; sprzetTyp: string; sprzetId: number }[]) {
  return Promise.all(
    pozycje.map(async (p) => ({
      ...p,
      sprzet: await getEquipmentSummary(p.sprzetTyp as EquipmentType, p.sprzetId),
    })),
  );
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

fakturyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const sprzetTyp = typeof req.query.sprzetTyp === 'string' ? req.query.sprzetTyp : undefined;
    const sprzetId = req.query.sprzetId ? Number(req.query.sprzetId) : undefined;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [{ numer: { contains: q } }, { numerKsef: { contains: q } }];
    }
    // Filtr "faktury przypięte do tej konkretnej sztuki sprzętu" — używany na stronach
    // szczegółów sprzętu do wyświetlenia odnośnika do faktury.
    if (sprzetTyp && sprzetId) {
      where.pozycje = { some: { sprzetTyp, sprzetId } };
    }

    const items = await prisma.faktura.findMany({
      where,
      include: { pozycje: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }),
);

fakturyRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const faktura = await prisma.faktura.findUnique({ where: { id }, include: { pozycje: true } });
    if (!faktura) throw new AppError(404, 'Nie znaleziono faktury');
    const pozycje = await resolvePozycje(faktura.pozycje);
    res.json({ item: { ...faktura, pozycje } });
  }),
);

fakturyRouter.post(
  '/',
  handleUpload,
  asyncHandler(async (req, res) => {
    try {
      const data = fakturaCreateSchema.parse(parseMultipartBody(req.body));
      const files = uploadedFiles(req);

      const faktura = await prisma.faktura.create({
        data: {
          numer: data.numer,
          numerKsef: data.numerKsef ?? null,
          kwotaGrosze: data.kwotaGrosze,
          plikPdf: files.plikPdf?.[0]?.filename ?? null,
          plikXml: files.plikXml?.[0]?.filename ?? null,
          pozycje: { create: data.pozycje.map((p) => ({ sprzetTyp: p.sprzetTyp, sprzetId: p.sprzetId })) },
        },
        include: { pozycje: true },
      });
      res.status(201).json({ item: faktura });
    } catch (err) {
      await cleanupFiles(Object.values(uploadedFiles(req)).flatMap((arr) => arr.map((f) => f.filename)));
      throw err;
    }
  }),
);

fakturyRouter.put(
  '/:id',
  handleUpload,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    try {
      const existing = await prisma.faktura.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, 'Nie znaleziono faktury');

      const data = fakturaUpdateSchema.parse(parseMultipartBody(req.body));
      const files = uploadedFiles(req);
      const newPdf = files.plikPdf?.[0]?.filename;
      const newXml = files.plikXml?.[0]?.filename;

      const updateData: Record<string, unknown> = {};
      if (data.numer !== undefined) updateData.numer = data.numer;
      if (data.numerKsef !== undefined) updateData.numerKsef = data.numerKsef;
      if (data.kwotaGrosze !== undefined) updateData.kwotaGrosze = data.kwotaGrosze;
      if (newPdf) updateData.plikPdf = newPdf;
      if (newXml) updateData.plikXml = newXml;

      const faktura = await prisma.$transaction(async (tx) => {
        if (data.pozycje) {
          // Pełne zastąpienie pozycji, tak jak przy edycji spisów sprzętu — jawne
          // dodaj/usuń zamiast diffowania starego i nowego zestawu.
          await tx.fakturaPozycja.deleteMany({ where: { fakturaId: id } });
          updateData.pozycje = { create: data.pozycje.map((p) => ({ sprzetTyp: p.sprzetTyp, sprzetId: p.sprzetId })) };
        }
        return tx.faktura.update({ where: { id }, data: updateData, include: { pozycje: true } });
      });

      // Podmiana pliku dopiero PO udanym update — żeby przy błędzie nie zostać bez pliku.
      await cleanupFiles([newPdf && existing.plikPdf, newXml && existing.plikXml].map((v) => (v ? v : null)));

      res.json({ item: faktura });
    } catch (err) {
      await cleanupFiles(Object.values(uploadedFiles(req)).flatMap((arr) => arr.map((f) => f.filename)));
      throw err;
    }
  }),
);

fakturyRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const faktura = await prisma.faktura.findUnique({ where: { id } });
    if (!faktura) throw new AppError(404, 'Nie znaleziono faktury');
    await prisma.faktura.delete({ where: { id } }); // faktura_pozycje kasowane kaskadowo
    await cleanupFiles([faktura.plikPdf, faktura.plikXml]);
    res.status(204).end();
  }),
);

// ---------------------------------------------------------------------------
// Pobieranie załączników
// ---------------------------------------------------------------------------

function downloadHandler(typ: 'pdf' | 'xml') {
  return asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const faktura = await prisma.faktura.findUnique({ where: { id } });
    if (!faktura) throw new AppError(404, 'Nie znaleziono faktury');
    const filename = typ === 'pdf' ? faktura.plikPdf : faktura.plikXml;
    if (!filename) throw new AppError(404, `Ta faktura nie ma załącznika ${typ.toUpperCase()}`);

    const filePath = path.join(UPLOADS_DIR, filename);
    const safeNumer = faktura.numer.replace(/[\\/:*?"<>|]/g, '_');
    res.download(filePath, `${safeNumer}.${typ}`, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: 'Załącznik nie jest już dostępny na serwerze' });
      }
    });
  });
}

fakturyRouter.get('/:id/plik/pdf', downloadHandler('pdf'));
fakturyRouter.get('/:id/plik/xml', downloadHandler('xml'));

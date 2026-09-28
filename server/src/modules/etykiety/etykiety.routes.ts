import { Router } from 'express';
import PdfPrinter from 'pdfmake';
import { z } from 'zod';
import { etykietyPdfSchema, SZABLON_ETYKIET_INFO, TYPY_Z_ETYKIETA } from 'shared';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { buildEtykietyDocDefinition } from '../../pdf/etykiety';
import { fontDescriptors } from '../../pdf/fonts';
import { listaSprzetuZEtykieta } from '../equipment/sprzetZEtykieta';

/** Naklejki z kodami QR prowadzącymi do karty sprzętu (i do potwierdzenia w spisie z natury). */
export const etykietyRouter = Router();

etykietyRouter.use(requireAuth, requireRole('ADMIN'));

const filtrSchema = z.object({
  typ: z.enum(TYPY_Z_ETYKIETA).optional(),
  dzialId: z.coerce.number().int().positive().optional(),
});

/** Sprzęt do wyboru na stronie naklejek (aktywny, z numerem ewidencyjnym). */
etykietyRouter.get(
  '/sprzet',
  asyncHandler(async (req, res) => {
    const { typ, dzialId } = filtrSchema.parse(req.query);
    res.json({ items: await listaSprzetuZEtykieta({ typy: typ ? [typ] : undefined, dzialId }) });
  }),
);

etykietyRouter.post(
  '/pdf',
  asyncHandler(async (req, res) => {
    const { pozycje, szablon, pierwszaEtykieta, adresAplikacji } = etykietyPdfSchema.parse(req.body);
    const sprzet = await listaSprzetuZEtykieta({ pozycje });
    if (sprzet.length === 0) throw new AppError(404, 'Nie znaleziono wybranego sprzętu');
    // Kolejność jak na liście wyboru (typ, potem numer) — łatwiej nakleić arkusz po arkuszu.
    const pdf = new PdfPrinter(fontDescriptors).createPdfKitDocument(
      buildEtykietyDocDefinition(sprzet, SZABLON_ETYKIET_INFO[szablon], pierwszaEtykieta, adresAplikacji),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etykiety-${new Date().toISOString().slice(0, 10)}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }),
);

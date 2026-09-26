import { Router } from 'express';
import PdfPrinter from 'pdfmake';
import { generateProtocolSchema, EQUIPMENT_TYPE_LABELS } from 'shared';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { getEquipmentSummary } from '../equipment/equipmentLookup';
import { fontDescriptors } from '../../pdf/fonts';
import { buildProtocolDocDefinition, type ProtocolItem } from '../../pdf/protocolTemplate';

export const protocolsRouter = Router();

protocolsRouter.use(requireAuth, requireRole('ADMIN'));

/** Usuwa polskie znaki diakrytyczne z nazwy pliku — nagłówek Content-Disposition
 *  z surowym UTF-8 w `filename=` bywa nieprzewidywalnie obsługiwany przez przeglądarki. */
function toAsciiFilename(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

protocolsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { employeeId, items, miscItemIds } = generateProtocolSchema.parse(req.body);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { dzial: true },
    });
    if (!employee) {
      throw new AppError(404, 'Nie znaleziono pracownika');
    }

    const equipmentItems = await Promise.all(
      items.map(async (ref) => {
        const summary = await getEquipmentSummary(ref.sprzetTyp, ref.sprzetId);
        if (!summary) {
          throw new AppError(404, `Nie znaleziono wskazanego sprzętu (${ref.sprzetTyp} #${ref.sprzetId})`);
        }
        return {
          typ: EQUIPMENT_TYPE_LABELS[ref.sprzetTyp],
          identyfikator: summary.identyfikator,
          numerSeryjny: summary.numerSeryjny,
          markaModel: summary.opis,
        };
      }),
    );

    // "Różne" (MiscItem) żyje poza EquipmentType — patrz komentarz przy modelu w
    // schema.prisma — więc jest rozwiązywane osobno i doklejane do tej samej tabeli PDF.
    const miscItems =
      miscItemIds.length > 0
        ? await prisma.miscItem.findMany({ where: { id: { in: miscItemIds }, employeeId } })
        : [];
    if (miscItems.length !== miscItemIds.length) {
      throw new AppError(404, 'Nie znaleziono jednej z wybranych pozycji "Różne"');
    }
    const miscProtocolItems = miscItems.map((m) => ({
      typ: 'Różne',
      identyfikator: m.opis,
      numerSeryjny: null,
      markaModel: null,
    }));

    const resolvedItems: ProtocolItem[] = [...equipmentItems, ...miscProtocolItems].map((it, index) => ({
      lp: index + 1,
      ...it,
    }));

    const docDefinition = buildProtocolDocDefinition(
      {
        imie: employee.imie,
        nazwisko: employee.nazwisko,
        stanowisko: employee.stanowisko,
        dzial: employee.dzial.nazwa,
      },
      resolvedItems,
    );

    const printer = new PdfPrinter(fontDescriptors);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const filename = toAsciiFilename(
      `protokol-${employee.nazwisko}-${employee.imie}-${new Date().toISOString().slice(0, 10)}.pdf`,
    ).replace(/\s+/g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  }),
);

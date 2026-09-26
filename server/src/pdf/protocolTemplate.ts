import type { TDocumentDefinitions } from 'pdfmake/interfaces';

export interface ProtocolEmployee {
  imie: string;
  nazwisko: string;
  stanowisko: string;
  dzial: string;
}

export interface ProtocolItem {
  lp: number;
  typ: string;
  identyfikator: string;
  numerSeryjny: string | null;
  markaModel: string | null;
}

/** Buduje definicję dokumentu pdfmake dla protokołu przekazania sprzętu:
 *  nagłówek z danymi pracownika, tabela pozycji sprzętu, miejsce na podpisy. */
export function buildProtocolDocDefinition(
  employee: ProtocolEmployee,
  items: ProtocolItem[],
): TDocumentDefinitions {
  const dataWystawienia = new Date().toLocaleDateString('pl-PL');

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
    content: [
      { text: 'Protokół przekazania sprzętu', style: 'title' },
      { text: `Data wystawienia: ${dataWystawienia}`, margin: [0, 2, 0, 16], color: '#6b7280' },
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [{ text: 'Pracownik:', bold: true }, `${employee.imie} ${employee.nazwisko}`],
            [{ text: 'Stanowisko:', bold: true }, employee.stanowisko],
            [{ text: 'Dział:', bold: true }, employee.dzial],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          headerRows: 1,
          widths: [24, 75, 95, 90, '*'],
          body: [
            [
              { text: 'Lp.', style: 'tableHeader' },
              { text: 'Typ', style: 'tableHeader' },
              { text: 'Nr ewidencyjny', style: 'tableHeader' },
              { text: 'Nr seryjny', style: 'tableHeader' },
              { text: 'Marka/model', style: 'tableHeader' },
            ],
            ...items.map((item) => [
              { text: String(item.lp), alignment: 'center' as const },
              item.typ,
              item.identyfikator,
              item.numerSeryjny ?? '—',
              item.markaModel ?? '—',
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f3f4f6' : null),
        },
      },
      {
        columns: [
          {
            text: '\n\n\n\n_________________________\nPrzekazujący (data, czytelny podpis)',
            alignment: 'center',
          },
          {
            text: '\n\n\n\n_________________________\nOdbierający (data, czytelny podpis)',
            alignment: 'center',
          },
        ],
        margin: [0, 50, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      tableHeader: { bold: true },
    },
  };
}

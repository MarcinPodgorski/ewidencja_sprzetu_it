import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

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
  /** Stan/uwagi przy zwrocie — gdy którakolwiek pozycja je ma, tabela dostaje kolumnę „Uwagi / stan”. */
  uwagi?: string | null;
}

/** Warianty protokołu: domyślnie przekazanie sprzętu, dla zwrotu inny tytuł, podpisy i sekcje. */
export interface ProtocolOptions {
  tytul?: string;
  /** Zdanie pod danymi pracownika, np. powód zwrotu. */
  wstep?: string | null;
  podpisy?: [string, string];
  data?: Date;
  notatka?: string | null;
  /** Druga tabela — np. sprzęt, który został u pracownika (niezwrócony). */
  pozostale?: { tytul: string; pozycje: ProtocolItem[] } | null;
}

function tabelaPozycji(items: ProtocolItem[]): Content {
  const zUwagami = items.some((item) => item.uwagi);
  const naglowki = ['Lp.', 'Typ', 'Nr ewidencyjny', 'Nr seryjny', 'Marka/model', ...(zUwagami ? ['Uwagi / stan'] : [])];
  return {
    table: {
      headerRows: 1,
      widths: zUwagami ? [22, 62, 80, 80, '*', 110] : [24, 75, 95, 90, '*'],
      body: [
        naglowki.map((text) => ({ text, style: 'tableHeader' })),
        ...items.map((item) => [
          { text: String(item.lp), alignment: 'center' as const },
          item.typ,
          item.identyfikator,
          item.numerSeryjny ?? '—',
          item.markaModel ?? '—',
          ...(zUwagami ? [item.uwagi ?? ''] : []),
        ]),
      ],
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f3f4f6' : null),
    },
  };
}

/** Buduje definicję dokumentu pdfmake dla protokołu przekazania albo zwrotu sprzętu:
 *  nagłówek z danymi pracownika, tabela pozycji sprzętu, miejsce na podpisy. */
export function buildProtocolDocDefinition(
  employee: ProtocolEmployee,
  items: ProtocolItem[],
  opcje: ProtocolOptions = {},
): TDocumentDefinitions {
  const dataWystawienia = (opcje.data ?? new Date()).toLocaleDateString('pl-PL');
  const [podpisLewy, podpisPrawy] = opcje.podpisy ?? ['Przekazujący', 'Odbierający'];

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
    content: [
      { text: opcje.tytul ?? 'Protokół przekazania sprzętu', style: 'title' },
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
        margin: [0, 0, 0, opcje.wstep ? 8 : 18],
      },
      ...(opcje.wstep ? [{ text: opcje.wstep, margin: [0, 0, 0, 14] } as Content] : []),
      tabelaPozycji(items),
      ...(opcje.pozostale && opcje.pozostale.pozycje.length > 0
        ? [
            { text: opcje.pozostale.tytul, style: 'subtitle', margin: [0, 18, 0, 6] } as Content,
            tabelaPozycji(opcje.pozostale.pozycje),
          ]
        : []),
      ...(opcje.notatka ? [{ text: [{ text: 'Uwagi: ', bold: true }, opcje.notatka], margin: [0, 14, 0, 0] } as Content] : []),
      {
        columns: [
          {
            text: `\n\n\n\n_________________________\n${podpisLewy} (data, czytelny podpis)`,
            alignment: 'center',
          },
          {
            text: `\n\n\n\n_________________________\n${podpisPrawy} (data, czytelny podpis)`,
            alignment: 'center',
          },
        ],
        margin: [0, 50, 0, 0],
        unbreakable: true,
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 11, bold: true },
      tableHeader: { bold: true },
    },
  };
}

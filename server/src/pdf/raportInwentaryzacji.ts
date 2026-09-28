import type { Prisma } from '@prisma/client';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';

type Inwentaryzacja = Prisma.InwentaryzacjaGetPayload<{
  include: { dzial: true; pozycje: { include: { potwierdzilAppUser: { select: { id: true; login: true } } } } };
}>;
type Pozycja = Inwentaryzacja['pozycje'][number];

const data = (d: Date) => d.toLocaleDateString('pl-PL');
const dataGodzina = (d: Date) => d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
const naglowek = (tekst: string) => ({ text: tekst, style: 'tableHeader' });
const uklad = { fillColor: (wiersz: number) => (wiersz === 0 ? '#f3f4f6' : null) };

function tabela(pozycje: Pozycja[], kolumnaPotwierdzenia: boolean): Content {
  return {
    table: {
      headerRows: 1,
      widths: kolumnaPotwierdzenia ? [20, 58, 70, '*', 95, 95] : [20, 60, 80, '*', 130],
      body: [
        [
          naglowek('Lp.'),
          naglowek('Typ'),
          naglowek('Nr ewidencyjny'),
          naglowek('Marka/model'),
          naglowek('Użytkownik / lokalizacja'),
          ...(kolumnaPotwierdzenia ? [naglowek('Potwierdzono')] : []),
        ],
        ...pozycje.map((p, i) => [
          { text: String(i + 1), alignment: 'center' as const },
          EQUIPMENT_TYPE_LABELS[p.sprzetTyp as EquipmentType] ?? p.sprzetTyp,
          p.identyfikator,
          p.opis ?? '—',
          p.uzytkownik ?? '—',
          ...(kolumnaPotwierdzenia
            ? [
                {
                  text: [
                    p.potwierdzonoAt ? dataGodzina(p.potwierdzonoAt) : '—',
                    p.potwierdzilAppUser ? `, ${p.potwierdzilAppUser.login}` : '',
                    p.uwagi ? `\n${p.uwagi}` : '',
                  ].join(''),
                  fontSize: 8,
                },
              ]
            : []),
        ]),
      ],
    },
    layout: uklad,
    fontSize: 9,
  };
}

/** Grupowanie po dziale z migawki (braki warto rozliczać z kierownikiem konkretnego działu). */
function wedlugDzialow(pozycje: Pozycja[]): [string, Pozycja[]][] {
  const grupy = new Map<string, Pozycja[]>();
  for (const p of pozycje) {
    const klucz = p.dzial ?? 'Bez działu';
    grupy.set(klucz, [...(grupy.get(klucz) ?? []), p]);
  }
  return [...grupy.entries()];
}

/** Raport ze spisu z natury: podsumowanie, braki według działów, znalezione spoza listy, potwierdzone. */
export function buildRaportInwentaryzacjiDocDefinition(inw: Inwentaryzacja): TDocumentDefinitions {
  const zListy = inw.pozycje.filter((p) => !p.spozaListy);
  const braki = zListy.filter((p) => !p.potwierdzonoAt);
  const spoza = inw.pozycje.filter((p) => p.spozaListy);
  const potwierdzone = inw.pozycje.filter((p) => p.potwierdzonoAt && !p.spozaListy);
  const procent = zListy.length ? Math.round((100 * potwierdzone.length) / zListy.length) : 100;

  const content: Content[] = [
    { text: 'Raport z inwentaryzacji', style: 'title' },
    { text: inw.nazwa, fontSize: 12, margin: [0, 2, 0, 14] },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Zakres:', bold: true }, inw.dzial ? `sprzęt pracowników działu ${inw.dzial.nazwa}` : 'cała firma'],
          [{ text: 'Rozpoczęta:', bold: true }, data(inw.createdAt)],
          [
            { text: inw.zamknietaAt ? 'Zamknięta:' : 'Stan na:', bold: true },
            inw.zamknietaAt ? data(inw.zamknietaAt) : `${data(new Date())} (inwentaryzacja w toku)`,
          ],
          [
            { text: 'Wynik:', bold: true },
            `potwierdzono ${potwierdzone.length} z ${zListy.length} pozycji (${procent}%), brakuje ${braki.length}` +
              (spoza.length ? `, znaleziono spoza listy: ${spoza.length}` : ''),
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 16],
    },
    { text: 'Braki', style: 'section' },
  ];

  if (braki.length === 0) {
    content.push({ text: 'Wszystkie pozycje z listy zostały potwierdzone.', margin: [0, 0, 0, 12] });
  } else {
    for (const [dzial, lista] of wedlugDzialow(braki)) {
      content.push({ text: `${dzial} (${lista.length})`, style: 'group' }, tabela(lista, false));
    }
  }

  if (spoza.length > 0) {
    content.push(
      { text: 'Znalezione spoza listy', style: 'section' },
      { text: 'Sprzęt potwierdzony podczas spisu, choć nie było go na liście (np. przypisany do innego działu).', fontSize: 9, color: '#6b7280', margin: [0, 0, 0, 6] },
      tabela(spoza, true),
    );
  }

  if (potwierdzone.length > 0) {
    content.push({ text: 'Potwierdzone', style: 'section' }, tabela(potwierdzone, true));
  }

  content.push({
    columns: [
      { text: '\n\n\n_________________________\nSporządził (data, podpis)', alignment: 'center' },
      { text: '\n\n\n_________________________\nZatwierdził (data, podpis)', alignment: 'center' },
    ],
    margin: [0, 36, 0, 0],
    unbreakable: true,
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 46, 40, 46],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
    footer: (strona: number, stron: number) => ({
      text: `${inw.nazwa} · strona ${strona} z ${stron}`,
      alignment: 'center',
      fontSize: 8,
      color: '#9ca3af',
      margin: [0, 14, 0, 0],
    }),
    content,
    styles: {
      title: { fontSize: 16, bold: true },
      section: { fontSize: 12, bold: true, margin: [0, 14, 0, 6] },
      group: { fontSize: 10, bold: true, color: '#374151', margin: [0, 8, 0, 4] },
      tableHeader: { bold: true },
    },
  };
}

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import qrcode from 'qrcode-generator';
import { EQUIPMENT_TYPE_LABELS, type WymiaryEtykiet } from 'shared';
import type { SprzetZEtykieta } from '../modules/equipment/sprzetZEtykieta';

const PT_NA_MM = 72 / 25.4;

/** Adres, który otworzy telefon po zeskanowaniu naklejki — numer ewidencyjny zamiast
 *  wewnętrznego ID, więc naklejka przetrwa np. przeniesienie bazy na nowy serwer. */
export function adresZKodu(adresAplikacji: string, numerEwidencyjny: string): string {
  return `${adresAplikacji.replace(/\/+$/, '')}/q/${encodeURIComponent(numerEwidencyjny)}`;
}

/**
 * Kod QR jako SVG — zamiast wbudowanego `qr` z pdfmake, który zaokrągla rozmiar modułu
 * w dół do całych punktów (na małej etykiecie 1,99 pt → 1 pt, czyli kod o połowę mniejszy).
 * Wektor skaluje się dokładnie do zadanej szerokości.
 */
function kodQrSvg(tekst: string): string {
  const kod = qrcode(0, 'M');
  kod.addData(tekst, 'Byte');
  kod.make();
  const n = kod.getModuleCount();
  let sciezka = '';
  for (let wiersz = 0; wiersz < n; wiersz++) {
    for (let kolumna = 0; kolumna < n; kolumna++) {
      if (kod.isDark(wiersz, kolumna)) sciezka += `M${kolumna} ${wiersz}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${sciezka}" fill="#000"/></svg>`;
}

function skroc(tekst: string, max: number): string {
  return tekst.length > max ? `${tekst.slice(0, max - 1).trimEnd()}…` : tekst;
}

/** Jedna naklejka: kod QR po lewej, numer ewidencyjny i opis po prawej. */
function etykieta(sprzet: SprzetZEtykieta, adresAplikacji: string, wymiary: WymiaryEtykiet, x: number, y: number): Content {
  const skala = wymiary.wysokosc / 37; // czcionki dobrane dla etykiety 70 × 37 mm
  const odstep = (wymiary.wysokosc < 30 ? 2 : 2.5) * PT_NA_MM;
  const kod = (wymiary.wysokosc * PT_NA_MM) - 2 * odstep;
  const szerokoscTekstu = wymiary.szerokosc * PT_NA_MM - kod - 3 * odstep;
  const maxZnakow = Math.max(14, Math.floor(szerokoscTekstu / (4.2 * skala)));
  const opis = [EQUIPMENT_TYPE_LABELS[sprzet.sprzetTyp], sprzet.opis].filter(Boolean).join(' · ');

  return {
    absolutePosition: { x: x + odstep, y: y + odstep },
    columns: [
      { width: kod, svg: kodQrSvg(adresZKodu(adresAplikacji, sprzet.identyfikator)), fit: [kod, kod] },
      {
        width: szerokoscTekstu,
        margin: [odstep, 0, 0, 0],
        stack: [
          { text: 'WŁASNOŚĆ FIRMY', fontSize: 5.5 * skala, color: '#6b7280', characterSpacing: 0.6 },
          { text: sprzet.identyfikator, fontSize: 12.5 * skala, bold: true, margin: [0, 1.5 * skala, 0, 1.5 * skala] },
          { text: skroc(opis, maxZnakow * 2), fontSize: 7 * skala, lineHeight: 1.1 },
          ...(sprzet.numerSeryjny && wymiary.wysokosc >= 29
            ? [{ text: skroc(`S/N ${sprzet.numerSeryjny}`, maxZnakow), fontSize: 6 * skala, color: '#6b7280', margin: [0, 1.5 * skala, 0, 0] } as Content]
            : []),
        ],
      },
    ],
    columnGap: 0,
  };
}

/**
 * Arkusz(e) naklejek. Etykiety są pozycjonowane bezwzględnie według wymiarów arkusza;
 * każda nowa strona zaczyna się pustym elementem z podziałem strony (pdfmake umieszcza
 * elementy absolutne na stronie, na której znajduje się bieżący przepływ dokumentu).
 */
export function buildEtykietyDocDefinition(
  pozycje: SprzetZEtykieta[],
  wymiary: WymiaryEtykiet,
  pierwszaEtykieta: number,
  adresAplikacji: string,
): TDocumentDefinitions {
  const naStronie = wymiary.kolumny * wymiary.wiersze;
  // Pominięcie zużytych etykiet ma sens tylko na arkuszu; na rolce każda strona to jedna etykieta.
  const przesuniecie = wymiary.arkuszA4 ? (pierwszaEtykieta - 1) % naStronie : 0;
  const content: Content[] = [];
  let ostatniaStrona = -1;

  pozycje.forEach((sprzet, i) => {
    const miejsce = przesuniecie + i;
    const strona = Math.floor(miejsce / naStronie);
    const slot = miejsce % naStronie;
    if (strona !== ostatniaStrona) {
      content.push({ text: '', ...(strona > 0 ? { pageBreak: 'before' as const } : {}) });
      ostatniaStrona = strona;
    }
    const x = (wymiary.marginesLewy + (slot % wymiary.kolumny) * wymiary.szerokosc) * PT_NA_MM;
    const y = (wymiary.marginesGorny + Math.floor(slot / wymiary.kolumny) * wymiary.wysokosc) * PT_NA_MM;
    content.push(etykieta(sprzet, adresAplikacji, wymiary, x, y));
  });

  return {
    pageSize: wymiary.arkuszA4 ? 'A4' : { width: wymiary.szerokosc * PT_NA_MM, height: wymiary.wysokosc * PT_NA_MM },
    pageMargins: [0, 0, 0, 0],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    content,
  };
}

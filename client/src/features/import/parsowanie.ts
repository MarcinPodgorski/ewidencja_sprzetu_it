import type { PoleImportu } from 'shared';
import { doPorownania } from '../../lib/tekst';

/**
 * Tabela z tekstu wklejonego z Excela (kolumny rozdzielone tabulatorem) albo z pliku CSV
 * (średnik — polski Excel — albo przecinek). Obsługuje cudzysłowy: komórka z enterem,
 * tabulatorem albo separatorem jest w nich zamknięta, a cudzysłów w środku podwojony.
 */
export function parsujTabele(tekst: string): string[][] {
  const t = tekst.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (t.trim() === '') return [];
  const pierwsza = t.slice(0, t.indexOf('\n') === -1 ? undefined : t.indexOf('\n'));
  const separator = pierwsza.includes('\t')
    ? '\t'
    : (pierwsza.match(/;/g)?.length ?? 0) >= (pierwsza.match(/,/g)?.length ?? 0)
      ? ';'
      : ',';

  const wiersze: string[][] = [];
  let wiersz: string[] = [];
  let komorka = '';
  let wCudzyslowie = false;
  for (let i = 0; i < t.length; i++) {
    const znak = t[i];
    if (wCudzyslowie) {
      if (znak === '"' && t[i + 1] === '"') {
        komorka += '"';
        i++;
      } else if (znak === '"') {
        wCudzyslowie = false;
      } else {
        komorka += znak;
      }
    } else if (znak === '"' && komorka === '') {
      wCudzyslowie = true;
    } else if (znak === separator) {
      wiersz.push(komorka);
      komorka = '';
    } else if (znak === '\n') {
      wiersz.push(komorka);
      wiersze.push(wiersz);
      wiersz = [];
      komorka = '';
    } else {
      komorka += znak;
    }
  }
  wiersz.push(komorka);
  wiersze.push(wiersz);
  // Puste wiersze na końcu (Excel dokleja enter po ostatnim wierszu).
  while (wiersze.length > 0 && wiersze[wiersze.length - 1].every((c) => c.trim() === '')) wiersze.pop();
  return wiersze;
}

function normalizujNaglowek(naglowek: string): string {
  return doPorownania(naglowek).replace(/[*:]/g, '').replace(/\s+/g, ' ').trim();
}

/** Jak dobrze nagłówek pasuje do pola: dokładnie (najlepiej) albo zawiera jedną z nazw jako osobne słowa. */
function ocenaNaglowka(naglowek: string, pole: PoleImportu): number {
  const h = normalizujNaglowek(naglowek);
  if (!h) return 0;
  let najlepsza = 0;
  for (const nazwa of [doPorownania(pole.etykieta), ...pole.naglowki]) {
    if (h === nazwa) return 1000 + nazwa.length;
    const granica = new RegExp(`(^|[^a-z0-9])${nazwa.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}($|[^a-z0-9])`);
    if (granica.test(h)) najlepsza = Math.max(najlepsza, nazwa.length);
  }
  return najlepsza;
}

/** Pole dla każdej kolumny wg nagłówków (null = pomiń); każde pole najwyżej raz, lepsze dopasowania wygrywają. */
export function dopasujKolumny(naglowki: string[], pola: PoleImportu[]): (string | null)[] {
  const kandydaci = naglowki.flatMap((naglowek, kolumna) =>
    pola.map((pole) => ({ kolumna, klucz: pole.klucz, ocena: ocenaNaglowka(naglowek, pole) })).filter((k) => k.ocena > 0),
  );
  kandydaci.sort((a, b) => b.ocena - a.ocena || a.kolumna - b.kolumna);
  const wynik: (string | null)[] = naglowki.map(() => null);
  const zajete = new Set<string>();
  for (const { kolumna, klucz } of kandydaci) {
    if (wynik[kolumna] !== null || zajete.has(klucz)) continue;
    wynik[kolumna] = klucz;
    zajete.add(klucz);
  }
  return wynik;
}

/** Czy pierwszy wiersz wygląda na nagłówki (co najmniej jedna komórka to znana nazwa kolumny). */
export function wygladaNaNaglowki(wiersz: string[], pola: PoleImportu[]): boolean {
  return dopasujKolumny(wiersz, pola).some((k) => k !== null);
}

/** A, B, …, Z, AA, AB… — jak kolumny w Excelu. */
export function literaKolumny(indeks: number): string {
  let n = indeks + 1;
  let wynik = '';
  while (n > 0) {
    const reszta = (n - 1) % 26;
    wynik = String.fromCharCode(65 + reszta) + wynik;
    n = Math.floor((n - 1) / 26);
  }
  return wynik;
}

/** Plik CSV (UTF-8 z BOM, średniki — Excel otworzy go z polskimi znakami) z samymi nagłówkami. */
export function szablonCsv(pola: PoleImportu[]): Blob {
  const naglowki = pola.map((p) => (/[;"\n]/.test(p.etykieta) ? `"${p.etykieta.replace(/"/g, '""')}"` : p.etykieta));
  return new Blob([`\uFEFF${naglowki.join(';')}\r\n`], { type: 'text/csv;charset=utf-8' });
}

/** Tekst pliku CSV: UTF-8, a jeśli to nie UTF-8 — Windows-1250 (domyślne kodowanie „CSV” w polskim Excelu). */
export async function wczytajPlik(plik: File): Promise<string> {
  const bajty = await plik.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bajty);
  } catch {
    return new TextDecoder('windows-1250').decode(bajty);
  }
}

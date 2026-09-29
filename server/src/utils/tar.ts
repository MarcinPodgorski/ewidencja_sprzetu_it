import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

/**
 * Minimalny zapis archiwum tar (format ustar) — wystarczy do spakowania katalogu kopii
 * zapasowej do pobrania, bez dodatkowej zależności. Obsługuje tylko zwykłe pliki
 * i katalogi; nazwy do 255 znaków (pole prefix + name), pliki do 8 GB.
 */

const BLOK = 512;

function oktalnie(liczba: number, dlugosc: number): string {
  return `${liczba.toString(8).padStart(dlugosc - 1, '0')}\0`;
}

/** Dzieli ścieżkę na prefix (≤155) i nazwę (≤100) na granicy katalogu, jak wymaga ustar. */
function podzielNazwe(sciezka: string): { prefix: string; nazwa: string } {
  if (Buffer.byteLength(sciezka) <= 100) return { prefix: '', nazwa: sciezka };
  const czesci = sciezka.split('/');
  for (let i = 1; i < czesci.length; i++) {
    const prefix = czesci.slice(0, i).join('/');
    const nazwa = czesci.slice(i).join('/');
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(nazwa) <= 100) return { prefix, nazwa };
  }
  throw new Error(`Ścieżka za długa dla formatu tar: ${sciezka}`);
}

function naglowek(sciezka: string, rozmiar: number, mtime: Date, katalog: boolean): Buffer {
  const b = Buffer.alloc(BLOK, 0);
  const { prefix, nazwa } = podzielNazwe(sciezka);
  b.write(nazwa, 0, 100, 'utf8');
  b.write(oktalnie(katalog ? 0o755 : 0o644, 8), 100, 8, 'ascii');
  b.write(oktalnie(0, 8), 108, 8, 'ascii'); // uid
  b.write(oktalnie(0, 8), 116, 8, 'ascii'); // gid
  b.write(oktalnie(katalog ? 0 : rozmiar, 12), 124, 12, 'ascii');
  b.write(oktalnie(Math.floor(mtime.getTime() / 1000), 12), 136, 12, 'ascii');
  b.fill(0x20, 148, 156); // suma kontrolna liczona ze spacjami w jej miejscu
  b.write(katalog ? '5' : '0', 156, 1, 'ascii');
  b.write('ustar\0', 257, 6, 'ascii');
  b.write('00', 263, 2, 'ascii');
  b.write(prefix, 345, 155, 'utf8');
  let suma = 0;
  for (const bajt of b) suma += bajt;
  b.write(`${suma.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  return b;
}

async function* wpisy(katalog: string, wArchiwum: string): AsyncGenerator<Buffer> {
  const elementy = await fs.promises.readdir(katalog, { withFileTypes: true });
  elementy.sort((a, b) => a.name.localeCompare(b.name));
  for (const element of elementy) {
    const pelna = path.join(katalog, element.name);
    const nazwa = `${wArchiwum}/${element.name}`;
    const stat = await fs.promises.stat(pelna);
    if (element.isDirectory()) {
      yield naglowek(`${nazwa}/`, 0, stat.mtime, true);
      yield* wpisy(pelna, nazwa);
    } else if (element.isFile()) {
      yield naglowek(nazwa, stat.size, stat.mtime, false);
      for await (const kawalek of fs.createReadStream(pelna)) yield kawalek as Buffer;
      const reszta = stat.size % BLOK;
      if (reszta) yield Buffer.alloc(BLOK - reszta, 0);
    }
  }
}

/** Strumień tar całego katalogu; w archiwum wszystko leży w folderze `nazwaGlowna/`. */
export function strumienTar(katalog: string, nazwaGlowna: string): Readable {
  async function* archiwum() {
    const stat = await fs.promises.stat(katalog);
    yield naglowek(`${nazwaGlowna}/`, 0, stat.mtime, true);
    yield* wpisy(katalog, nazwaGlowna);
    yield Buffer.alloc(BLOK * 2, 0); // koniec archiwum: dwa puste bloki
  }
  return Readable.from(archiwum());
}

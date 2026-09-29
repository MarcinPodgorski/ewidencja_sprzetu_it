import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { UPLOADS_ROOT } from '../../config/uploads';
import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * Kopie zapasowe: katalog BACKUP_DIR/<RRRR-MM-DD_GG-MM-SS>/ z:
 *   baza.db    — spójna kopia bazy przez `VACUUM INTO` (działa na żywo, także w trybie WAL,
 *                w którym sam plik .db nie zawiera jeszcze ostatnich zmian),
 *   uploads/   — załączniki faktur i instalatory; twarde dowiązania zamiast kopii, bo pliki
 *                są niezmienne (podmiana = nowy plik o losowej nazwie). Niezmieniony plik nie
 *                zajmuje więc miejsca drugi raz, a kopia przeżyje jego usunięcie z aplikacji,
 *   kopia.json — metadane do listy w aplikacji.
 */

export type RodzajKopii = 'AUTOMATYCZNA' | 'RECZNA' | 'PRZED_IMPORTEM';

export interface KopiaZapasowa {
  nazwa: string;
  utworzono: string;
  rodzaj: RodzajKopii;
  rozmiarBazy: number;
  liczbaPlikow: number;
  rozmiarPlikow: number;
}

export const NAZWA_KOPII = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
/** Najnowsze kopie zostają zawsze — nawet gdy serwer długo nie działał i wszystkie są „stare”. */
const ZAWSZE_ZOSTAW = 3;

let trwa = false;
let ostatniBlad: { kiedy: string; komunikat: string } | null = null;

const dwucyfrowo = (n: number) => String(n).padStart(2, '0');

function nazwaDla(data: Date): string {
  return (
    `${data.getFullYear()}-${dwucyfrowo(data.getMonth() + 1)}-${dwucyfrowo(data.getDate())}_` +
    `${dwucyfrowo(data.getHours())}-${dwucyfrowo(data.getMinutes())}-${dwucyfrowo(data.getSeconds())}`
  );
}

export function sciezkaKopii(nazwa: string): string {
  if (!NAZWA_KOPII.test(nazwa)) throw new AppError(400, 'Nieprawidłowa nazwa kopii');
  return path.join(env.BACKUP_DIR, nazwa);
}

/** Ścieżka pliku bazy z DATABASE_URL (env.ts zamienia ją zawsze na bezwzględną). */
export function sciezkaBazy(): string {
  return env.DATABASE_URL.replace(/^file:/, '').replace(/\?.*$/, '');
}

/** Rekurencyjnie: twarde dowiązanie, a gdy się nie da (inny dysk, system plików bez dowiązań) — kopia. */
async function skopiujPliki(zrodlo: string, cel: string): Promise<{ liczba: number; rozmiar: number }> {
  let liczba = 0;
  let rozmiar = 0;
  let wpisy: fs.Dirent[];
  try {
    wpisy = await fs.promises.readdir(zrodlo, { withFileTypes: true });
  } catch {
    return { liczba, rozmiar };
  }
  await fs.promises.mkdir(cel, { recursive: true });
  for (const wpis of wpisy) {
    const z = path.join(zrodlo, wpis.name);
    const c = path.join(cel, wpis.name);
    if (wpis.isDirectory()) {
      const pod = await skopiujPliki(z, c);
      liczba += pod.liczba;
      rozmiar += pod.rozmiar;
    } else if (wpis.isFile()) {
      try {
        await fs.promises.link(z, c);
      } catch {
        await fs.promises.copyFile(z, c);
      }
      liczba += 1;
      rozmiar += (await fs.promises.stat(c)).size;
    }
  }
  return { liczba, rozmiar };
}

async function wczytajMetadane(nazwa: string): Promise<KopiaZapasowa | null> {
  try {
    const meta = JSON.parse(await fs.promises.readFile(path.join(sciezkaKopii(nazwa), 'kopia.json'), 'utf8'));
    return { ...meta, nazwa };
  } catch {
    return null;
  }
}

/** Kopie od najnowszej. Katalogi bez metadanych (np. ręcznie zmienione) są pomijane. */
export async function listaKopii(): Promise<KopiaZapasowa[]> {
  let nazwy: string[];
  try {
    nazwy = (await fs.promises.readdir(env.BACKUP_DIR)).filter((n) => NAZWA_KOPII.test(n));
  } catch {
    return [];
  }
  const kopie = await Promise.all(nazwy.sort().reverse().map(wczytajMetadane));
  return kopie.filter((k): k is KopiaZapasowa => k !== null);
}

async function usunStare(): Promise<void> {
  const granica = Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kopie = await listaKopii();
  for (const kopia of kopie.slice(ZAWSZE_ZOSTAW)) {
    if (new Date(kopia.utworzono).getTime() < granica) {
      await fs.promises.rm(sciezkaKopii(kopia.nazwa), { recursive: true, force: true });
    }
  }
}

export async function utworzKopie(rodzaj: RodzajKopii): Promise<KopiaZapasowa> {
  if (trwa) throw new AppError(409, 'Kopia jest właśnie tworzona — spróbuj za chwilę');
  trwa = true;
  const teraz = new Date();
  const nazwa = nazwaDla(teraz);
  // Kopia powstaje w katalogu tymczasowym i dopiero na końcu dostaje właściwą nazwę —
  // przerwana (np. brak miejsca, restart) nigdy nie wygląda na kompletną.
  const tymczasowy = path.join(env.BACKUP_DIR, `.${nazwa}.tmp`);
  try {
    await fs.promises.mkdir(tymczasowy, { recursive: true });
    const plikBazy = path.join(tymczasowy, 'baza.db');
    await prisma.$executeRawUnsafe(`VACUUM INTO '${plikBazy.replace(/'/g, "''")}'`);
    const pliki = await skopiujPliki(UPLOADS_ROOT, path.join(tymczasowy, 'uploads'));
    const kopia: KopiaZapasowa = {
      nazwa,
      utworzono: teraz.toISOString(),
      rodzaj,
      rozmiarBazy: (await fs.promises.stat(plikBazy)).size,
      liczbaPlikow: pliki.liczba,
      rozmiarPlikow: pliki.rozmiar,
    };
    await fs.promises.writeFile(path.join(tymczasowy, 'kopia.json'), JSON.stringify(kopia, null, 2));
    await fs.promises.rename(tymczasowy, sciezkaKopii(nazwa));
    ostatniBlad = null;
    await usunStare();
    return kopia;
  } catch (err) {
    ostatniBlad = { kiedy: new Date().toISOString(), komunikat: err instanceof Error ? err.message : String(err) };
    await fs.promises.rm(tymczasowy, { recursive: true, force: true }).catch(() => {});
    throw err instanceof AppError ? err : new AppError(500, `Nie udało się utworzyć kopii: ${ostatniBlad.komunikat}`);
  } finally {
    trwa = false;
  }
}

export function nastepnaAutomatyczna(od = new Date()): Date | null {
  if (!env.BACKUP_AUTO) return null;
  const nastepna = new Date(od);
  nastepna.setHours(env.BACKUP_HOUR, 0, 0, 0);
  if (nastepna <= od) nastepna.setDate(nastepna.getDate() + 1);
  return nastepna;
}

export async function stanKopii() {
  const kopie = await listaKopii();
  return {
    ostatnia: kopie[0] ?? null,
    ostatniBlad,
    trwa,
    automatyczne: env.BACKUP_AUTO,
    godzina: env.BACKUP_HOUR,
    retencjaDni: env.BACKUP_RETENTION_DAYS,
    nastepna: nastepnaAutomatyczna()?.toISOString() ?? null,
    katalog: env.BACKUP_DIR,
    sciezkaBazy: sciezkaBazy(),
    katalogUploads: UPLOADS_ROOT,
    docker: env.RUNS_IN_DOCKER,
  };
}

/** Codzienna kopia o BACKUP_HOUR + nadrobienie kopii, jeśli serwer był wyłączony o tej porze. */
export function uruchomHarmonogramKopii(): void {
  if (!env.BACKUP_AUTO) return;

  const zaplanuj = () => {
    const nastepna = nastepnaAutomatyczna()!;
    setTimeout(() => {
      utworzKopie('AUTOMATYCZNA')
        .catch((err) => console.error('[kopie] automatyczna kopia nie powiodła się:', err))
        .finally(zaplanuj);
    }, nastepna.getTime() - Date.now()).unref();
  };
  zaplanuj();

  setTimeout(async () => {
    const ostatnia = (await listaKopii())[0];
    if (!ostatnia || Date.now() - new Date(ostatnia.utworzono).getTime() > 24 * 60 * 60 * 1000) {
      await utworzKopie('AUTOMATYCZNA').catch((err) => console.error('[kopie] kopia po starcie nie powiodła się:', err));
    }
  }, 2 * 60 * 1000).unref();
}

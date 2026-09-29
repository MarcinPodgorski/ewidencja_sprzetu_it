import fs from 'fs';
import path from 'path';
import { env } from './env';

/**
 * Katalogi na wgrane pliki — poza `prisma/` (to nie baza danych) i poza `dist/`
 * (żeby przeżyły `npm run build`/`clean`). Domyślnie server/uploads; zmienna
 * UPLOADS_DIR przenosi je np. do wolumenu /data w Dockerze — obok kopii zapasowych,
 * żeby kopie mogły twardo dowiązywać pliki zamiast je kopiować.
 */
export const UPLOADS_ROOT = env.UPLOADS_DIR;

/** Załączniki faktur (PDF/XML). */
export const UPLOADS_DIR = path.join(UPLOADS_ROOT, 'faktury');

/** Pliki instalacyjne z katalogu oprogramowania onboardingu (np. instalator ESET). */
export const INSTALATORY_DIR = path.join(UPLOADS_ROOT, 'instalatory');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(INSTALATORY_DIR, { recursive: true });

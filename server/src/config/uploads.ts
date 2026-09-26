import fs from 'fs';
import path from 'path';

/**
 * Katalogi na wgrane pliki — poza `prisma/` (to nie baza danych) i poza `dist/`
 * (żeby przeżyły `npm run build`/`clean`). Rozwiązywane jako ścieżki bezwzględne
 * względem lokalizacji tego pliku źródłowego (ten sam powód co przy DATABASE_URL w
 * config/env.ts: cwd różni się między `tsx watch` w dev a PM2 w produkcji).
 */
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

/** Załączniki faktur (PDF/XML). */
export const UPLOADS_DIR = path.join(UPLOADS_ROOT, 'faktury');

/** Pliki instalacyjne z katalogu oprogramowania onboardingu (np. instalator ESET). */
export const INSTALATORY_DIR = path.join(UPLOADS_ROOT, 'instalatory');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(INSTALATORY_DIR, { recursive: true });

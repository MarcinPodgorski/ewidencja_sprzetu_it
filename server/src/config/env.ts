import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// W dev cwd = server/ (skrypty npm workspace), więc `.env` znajdowany jest domyślnie
// w server/.env. W produkcji PM2 wstrzykuje zmienne bezpośrednio przez `env` w
// ecosystem.config.js — plik .env wtedy nie jest wymagany (dotenv po prostu nic nie
// znajdzie i nie nadpisze już ustawionych process.env).
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL jest wymagane'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET powinien mieć min. 16 znaków'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  APP_BASE_PATH: z.string().default('/sprzet'),
  /** Katalog kopii zapasowych (baza + wgrane pliki). Względny = względem server/. */
  BACKUP_DIR: z.string().default('backups'),
  /** Ile dni przechowywać kopie (najnowsze trzy zostają zawsze). */
  BACKUP_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  /** Godzina codziennej automatycznej kopii (czas lokalny serwera). */
  BACKUP_HOUR: z.coerce.number().int().min(0).max(23).default(2),
  /** Automatyczne kopie: domyślnie włączone tylko w produkcji. */
  BACKUP_AUTO: z.enum(['true', 'false']).optional(),
  /** Ustawiane w obrazie Dockera — strona kopii pokazuje wtedy polecenia dla docker compose. */
  RUNS_IN_DOCKER: z.enum(['true', 'false']).optional(),
  /** Wgrane pliki (załączniki faktur, instalatory). Względny = względem server/. */
  UPLOADS_DIR: z.string().default('uploads'),
  /** Hasło konta „admin” zakładanego przy pierwszym starcie na pustej bazie (brak = losowe, w logu). */
  INITIAL_ADMIN_PASSWORD: z.preprocess(
    (v) => (v === '' ? undefined : v), // docker compose przekazuje niepodaną zmienną jako pusty tekst
    z.string().min(8, 'INITIAL_ADMIN_PASSWORD: minimum 8 znaków').optional(),
  ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Nieprawidłowa konfiguracja środowiska (.env):');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

/**
 * Pułapka Prisma+SQLite: `prisma migrate`/`db seed` (CLI) rozwiązują względną ścieżkę
 * w `file:...` DATABASE_URL względem lokalizacji `schema.prisma` (server/prisma/),
 * natomiast `PrismaClient` w runtime rozwiązuje ją względem `process.cwd()`. Przy
 * różnych cwd (npm workspace script w dev vs PM2 w prod) te dwa mechanizmy potrafią
 * wskazać na DWA RÓŻNE pliki bazy, mimo identycznego DATABASE_URL w .env — appka
 * "działa", ale czyta pustą/inną bazę niż ta, na której CLI robiło migracje/seed.
 * Wymuszamy tu jawnie tę samą, jednoznaczną (bezwzględną) ścieżkę zgodną z konwencją
 * CLI, więc obie strony zawsze operują na tym samym pliku niezależnie od cwd.
 */
if (data.DATABASE_URL.startsWith('file:') && !data.DATABASE_URL.startsWith('file:/')) {
  const prismaDir = path.resolve(__dirname, '../../prisma');
  const relativePath = data.DATABASE_URL.slice('file:'.length);
  data.DATABASE_URL = `file:${path.resolve(prismaDir, relativePath)}`;
  process.env.DATABASE_URL = data.DATABASE_URL;
}

/** Kopie zapasowe i wgrane pliki: ścieżki bezwzględne (jak przy bazie — cwd różni się między dev a PM2). */
const wzgledemServera = (sciezka: string) => (path.isAbsolute(sciezka) ? sciezka : path.resolve(__dirname, '../..', sciezka));
const backupDir = wzgledemServera(data.BACKUP_DIR);

export const env = {
  ...data,
  BACKUP_DIR: backupDir,
  UPLOADS_DIR: wzgledemServera(data.UPLOADS_DIR),
  RUNS_IN_DOCKER: data.RUNS_IN_DOCKER === 'true',
  BACKUP_AUTO: data.BACKUP_AUTO ? data.BACKUP_AUTO === 'true' : data.NODE_ENV === 'production',
};
export type Env = typeof env;

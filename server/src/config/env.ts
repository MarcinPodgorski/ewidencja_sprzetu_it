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

export const env = data;
export type Env = typeof env;

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * SQLite domyślnie nie włącza WAL ani wymuszania kluczy obcych per połączenie —
 * ustawiamy to jawnie przy starcie serwera (patrz index.ts). WAL poprawia
 * współbieżność odczyt/zapis, foreign_keys=ON pilnuje integralności referencyjnej
 * (istotne np. przy PeripheralPair, PrinterToner).
 */
export async function initDatabase(): Promise<void> {
  // PRAGMA journal_mode zwraca wiersz wyniku (nowy tryb) — SQLite driver w Prisma
  // wymaga wtedy $queryRawUnsafe, $executeRawUnsafe jest tylko dla statementów bez wyniku.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
}

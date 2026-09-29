import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';

/**
 * Świeża baza (pierwszy start w Dockerze albo na nowym serwerze) nie ma żadnego konta,
 * więc nie dałoby się zalogować. Zakłada wtedy konto „admin” z hasłem z
 * INITIAL_ADMIN_PASSWORD albo losowym, wypisanym w logu. Gdy jakiekolwiek konto już
 * istnieje, nic nie robi — zmiana zmiennej później niczego nie nadpisze.
 */
export async function utworzPierwszegoAdmina(): Promise<void> {
  if ((await prisma.appUser.count()) > 0) return;
  const haslo = env.INITIAL_ADMIN_PASSWORD ?? crypto.randomBytes(9).toString('base64url');
  await prisma.appUser.create({
    data: {
      imie: 'Administrator',
      nazwisko: 'IT',
      login: 'admin',
      hasloHash: await bcrypt.hash(haslo, 10),
      rola: 'ADMIN',
    },
  });
  console.log('[sprzet-it] ============================================================');
  console.log('[sprzet-it] Pusta baza — utworzono konto administratora.');
  console.log('[sprzet-it]   login: admin');
  console.log(
    env.INITIAL_ADMIN_PASSWORD
      ? '[sprzet-it]   hasło: z INITIAL_ADMIN_PASSWORD'
      : `[sprzet-it]   hasło: ${haslo}   (zmień je po zalogowaniu: Mój profil)`,
  );
  console.log('[sprzet-it] ============================================================');
}

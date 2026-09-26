import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import type { AppUserRole } from 'shared';

export interface AuthenticatedUserDto {
  id: number;
  imie: string;
  nazwisko: string;
  login: string;
  rola: AppUserRole;
}

function toDto(user: { id: number; imie: string; nazwisko: string; login: string; rola: string }): AuthenticatedUserDto {
  return {
    id: user.id,
    imie: user.imie,
    nazwisko: user.nazwisko,
    login: user.login,
    rola: user.rola as AppUserRole,
  };
}

export async function login(loginValue: string, haslo: string): Promise<{ token: string; user: AuthenticatedUserDto }> {
  const user = await prisma.appUser.findUnique({ where: { login: loginValue } });

  // Celowo ten sam komunikat dla "brak konta" i "złe hasło" — nie ujawniamy,
  // czy dany login istnieje w systemie.
  if (!user || !user.aktywny) {
    throw new AppError(401, 'Nieprawidłowy login lub hasło');
  }

  const passwordOk = await verifyPassword(haslo, user.hasloHash);
  if (!passwordOk) {
    throw new AppError(401, 'Nieprawidłowy login lub hasło');
  }

  const token = signToken({ sub: user.id, login: user.login, rola: user.rola as AppUserRole });
  return { token, user: toDto(user) };
}

export async function getById(id: number): Promise<AuthenticatedUserDto> {
  const user = await prisma.appUser.findUnique({ where: { id } });
  if (!user || !user.aktywny) {
    throw new AppError(401, 'Sesja nieważna — zaloguj się ponownie');
  }
  return toDto(user);
}

export async function changeOwnPassword(userId: number, obecneHaslo: string, noweHaslo: string): Promise<void> {
  const user = await prisma.appUser.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'Nie znaleziono konta');
  }
  const ok = await verifyPassword(obecneHaslo, user.hasloHash);
  if (!ok) {
    throw new AppError(400, 'Obecne hasło jest nieprawidłowe');
  }
  const hasloHash = await hashPassword(noweHaslo);
  await prisma.appUser.update({ where: { id: userId }, data: { hasloHash } });
}

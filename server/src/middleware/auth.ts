import type { NextFunction, Request, Response } from 'express';
import type { AppUserRole, PermissionLevel } from 'shared';
import { prisma } from '../db/prisma';
import { verifyToken } from '../utils/jwt';
import { AppError, asyncHandler } from './errorHandler';

export const COOKIE_NAME = 'token';

/**
 * Weryfikuje JWT z cookie i ustawia `req.user`. Dodatkowo sprawdza w bazie, że konto
 * wciąż istnieje i jest aktywne — chroni przed dalszym używaniem tokenu wydanego
 * przed dezaktywacją konta (token sam w sobie byłby ważny aż do wygaśnięcia).
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    throw new AppError(401, 'Wymagane zalogowanie');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Sesja wygasła — zaloguj się ponownie');
  }

  const user = await prisma.appUser.findUnique({ where: { id: payload.sub } });
  if (!user || !user.aktywny) {
    throw new AppError(401, 'Sesja nieważna — zaloguj się ponownie');
  }

  req.user = { id: user.id, login: user.login, rola: user.rola as AppUserRole };
  next();
});

/** Blokuje dostęp, jeśli rola zalogowanego użytkownika nie znajduje się na liście dozwolonych. */
export function requireRole(...roles: AppUserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Wymagane zalogowanie'));
    }
    if (!roles.includes(req.user.rola)) {
      return next(new AppError(403, 'Brak uprawnień do tej operacji'));
    }
    next();
  };
}

/**
 * Autoryzacja na poziomie konkretnego spisu (EquipmentList). Admin ma dostęp
 * automatycznie (bypass). Rola "user" musi mieć jawnie nadane uprawnienie o
 * wymaganym (lub wyższym) poziomie — EDIT implikuje też VIEW.
 *
 * Oczekuje identyfikatora spisu w `req.params.id` albo `req.params.listId`.
 */
export function requireListPermission(minLevel: PermissionLevel) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Wymagane zalogowanie');
    }
    if (req.user.rola === 'ADMIN') {
      return next();
    }

    const rawId = req.params.listId ?? req.params.id;
    const listId = Number(rawId);
    if (!Number.isInteger(listId) || listId <= 0) {
      throw new AppError(400, 'Nieprawidłowy identyfikator spisu');
    }

    const permission = await prisma.equipmentListPermission.findUnique({
      where: { listId_appUserId: { listId, appUserId: req.user.id } },
    });

    if (!permission) {
      throw new AppError(403, 'Brak dostępu do tego spisu');
    }
    if (minLevel === 'EDIT' && permission.poziom !== 'EDIT') {
      throw new AppError(403, 'Wymagane uprawnienie do edycji tego spisu');
    }

    next();
  });
}

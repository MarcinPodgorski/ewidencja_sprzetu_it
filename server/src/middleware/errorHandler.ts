import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/** Błąd domenowy/HTTP ze statusem — rzucany świadomie w serwisach i routach. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Owija async route handler tak, by odrzucone Promise trafiały do errorHandlera. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, `Nie znaleziono zasobu: ${req.method} ${req.originalUrl}`));
}

/** Błąd parsera treści żądania (express.json): uszkodzony JSON, za duże dane — to błąd klienta, nie serwera. */
function bladTresciZadania(err: unknown): { status: number; komunikat: string } | null {
  if (typeof err !== 'object' || err === null || !('type' in err) || !('status' in err)) return null;
  const { type, status } = err as { type: unknown; status: unknown };
  if (typeof status !== 'number' || status < 400 || status >= 500) return null;
  if (type === 'entity.too.large') {
    return { status: 413, komunikat: 'Za dużo danych w jednym żądaniu — podziel je na mniejsze części' };
  }
  if (type === 'entity.parse.failed') return { status: 400, komunikat: 'Nieprawidłowy format danych (JSON)' };
  return { status, komunikat: 'Nieprawidłowe żądanie' };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Błąd walidacji danych', details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  const bladTresci = bladTresciZadania(err);
  if (bladTresci) {
    res.status(bladTresci.status).json({ error: bladTresci.komunikat });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'Rekord z taką wartością unikalnego pola już istnieje',
        details: err.meta,
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Odwołanie do nieistniejącego powiązanego rekordu', details: err.meta });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Nie znaleziono rekordu' });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
}

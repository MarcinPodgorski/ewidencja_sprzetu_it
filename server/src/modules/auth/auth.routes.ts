import { Router } from 'express';
import { loginSchema, changePasswordSchema } from 'shared';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireAuth, COOKIE_NAME } from '../../middleware/auth';
import { env } from '../../config/env';
import { SESSION_MAX_AGE_MS } from '../../utils/jwt';
import * as authService from './auth.service';

export const authRouter = Router();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: env.APP_BASE_PATH,
    maxAge: SESSION_MAX_AGE_MS,
  };
}

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { login: loginValue, haslo } = loginSchema.parse(req.body);
    const { token, user } = await authService.login(loginValue, haslo);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ user });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: env.APP_BASE_PATH });
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getById(req.user!.id);
    res.json({ user });
  }),
);

authRouter.put(
  '/me/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { obecneHaslo, noweHaslo } = changePasswordSchema.parse(req.body);
    await authService.changeOwnPassword(req.user!.id, obecneHaslo, noweHaslo);
    res.status(204).end();
  }),
);

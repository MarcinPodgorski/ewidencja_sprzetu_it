import jwt from 'jsonwebtoken';
import type { AppUserRole } from 'shared';
import { env } from '../config/env';

export interface SessionPayload {
  sub: number;
  login: string;
  rola: AppUserRole;
}

const EXPIRES_IN = '12h';
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): SessionPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as unknown as SessionPayload;
}

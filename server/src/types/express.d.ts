import type { AppUserRole } from 'shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        login: string;
        rola: AppUserRole;
      };
    }
  }
}

export {};

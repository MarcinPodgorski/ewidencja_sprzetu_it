import { z } from 'zod';
import { requiredString } from './common';
import { APP_USER_ROLES } from '../enums';

export const appUserCreateSchema = z.object({
  imie: requiredString('Imię', 100),
  nazwisko: requiredString('Nazwisko', 100),
  login: requiredString('Login', 50).regex(
    /^[a-zA-Z0-9._-]+$/,
    'Login może zawierać tylko litery, cyfry, kropkę, myślnik i podkreślnik',
  ),
  haslo: z.string().min(8, 'Hasło musi mieć min. 8 znaków'),
  rola: z.enum(APP_USER_ROLES),
});
export type AppUserCreateInput = z.infer<typeof appUserCreateSchema>;

export const appUserUpdateSchema = z.object({
  imie: requiredString('Imię', 100).optional(),
  nazwisko: requiredString('Nazwisko', 100).optional(),
  rola: z.enum(APP_USER_ROLES).optional(),
  aktywny: z.boolean().optional(),
});
export type AppUserUpdateInput = z.infer<typeof appUserUpdateSchema>;

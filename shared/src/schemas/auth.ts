import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Login jest wymagany'),
  haslo: z.string().min(1, 'Hasło jest wymagane'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  obecneHaslo: z.string().min(1, 'Obecne hasło jest wymagane'),
  noweHaslo: z.string().min(8, 'Nowe hasło musi mieć min. 8 znaków'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
  noweHaslo: z.string().min(8, 'Nowe hasło musi mieć min. 8 znaków'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

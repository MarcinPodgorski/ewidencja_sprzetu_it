import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { loginSchema, type LoginInput } from 'shared';
import { useAuth } from '../auth/AuthContext';
import { Backdrop } from '../components/Backdrop';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await login(values.login, values.haslo);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Nie udało się zalogować');
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center px-4">
      <Backdrop />
      <div className="w-full max-w-sm animate-page-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition-transform duration-500 hover:-rotate-6 hover:scale-105">
            <Boxes className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Ewidencja sprzętu IT</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Zaloguj się do systemu</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6 shadow-soft-lg backdrop-blur">
          <div>
            <label htmlFor="login" className="label">
              Login
            </label>
            <input id="login" type="text" autoComplete="username" className="input" {...register('login')} />
            {errors.login && <p className="field-error">{errors.login.message}</p>}
          </div>

          <div>
            <label htmlFor="haslo" className="label">
              Hasło
            </label>
            <input
              id="haslo"
              type="password"
              autoComplete="current-password"
              className="input"
              {...register('haslo')}
            />
            {errors.haslo && <p className="field-error">{errors.haslo.message}</p>}
          </div>

          {serverError && (
            <div className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{serverError}</div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  );
}

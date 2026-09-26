import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from 'shared';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';

export function ProfilePage() {
  const { user } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    setMessage(null);
    try {
      await api.put('/auth/me/password', values);
      setMessage({ type: 'success', text: 'Hasło zostało zmienione.' });
      reset();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Nie udało się zmienić hasła' });
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Profil</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {user?.imie} {user?.nazwisko} · login: {user?.login} · rola: {user?.rola === 'ADMIN' ? 'admin' : 'user'}
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Zmiana hasła</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="obecneHaslo" className="label">
              Obecne hasło
            </label>
            <input id="obecneHaslo" type="password" className="input" {...register('obecneHaslo')} />
            {errors.obecneHaslo && <p className="field-error">{errors.obecneHaslo.message}</p>}
          </div>
          <div>
            <label htmlFor="noweHaslo" className="label">
              Nowe hasło
            </label>
            <input id="noweHaslo" type="password" className="input" {...register('noweHaslo')} />
            {errors.noweHaslo && <p className="field-error">{errors.noweHaslo.message}</p>}
          </div>

          {message && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Zapisywanie…' : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { appUserCreateSchema, resetPasswordSchema, type AppUserCreateInput, type ResetPasswordInput } from 'shared';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { SelectField, TextField } from '../../components/form/fields';
import { api, ApiError } from '../../lib/api';
import { appUsersApi } from '../entities';
import type { AppUser } from '../../types/entities';

export function AppUsersPage() {
  const { data: items, isLoading } = appUsersApi.useList();
  const createMutation = appUsersApi.useCreate();
  const updateMutation = appUsersApi.useUpdate();

  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<AppUserCreateInput>({
    resolver: zodResolver(appUserCreateSchema),
    defaultValues: { imie: '', nazwisko: '', login: '', haslo: '', rola: 'USER' },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { noweHaslo: '' },
  });

  async function onCreate(values: AppUserCreateInput) {
    try {
      await createMutation.mutateAsync(values);
      setShowCreate(false);
      createForm.reset();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Nie udało się utworzyć konta');
    }
  }

  async function onResetPassword(values: ResetPasswordInput) {
    if (!resetTarget) return;
    try {
      await api.put(`/app-users/${resetTarget.id}/reset-password`, values);
      setResetTarget(null);
      resetForm.reset();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Nie udało się zresetować hasła');
    }
  }

  function toggleActive(user: AppUser) {
    updateMutation.mutate({ id: user.id, data: { aktywny: !user.aktywny } });
  }

  const columns: Column<AppUser>[] = [
    { key: 'login', header: 'Login', render: (u) => u.login },
    { key: 'imie', header: 'Imię i nazwisko', render: (u) => `${u.imie} ${u.nazwisko}` },
    {
      key: 'rola',
      header: 'Rola',
      render: (u) => (
        <span className={`badge ${u.rola === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
          {u.rola === 'ADMIN' ? 'admin' : 'user'}
        </span>
      ),
    },
    {
      key: 'aktywny',
      header: 'Status',
      render: (u) =>
        u.aktywny ? (
          <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">aktywny</span>
        ) : (
          <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">nieaktywny</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex justify-end gap-3 text-sm">
          <button type="button" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" onClick={() => setResetTarget(u)}>
            reset hasła
          </button>
          <button type="button" className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100" onClick={() => toggleActive(u)}>
            {u.aktywny ? 'dezaktywuj' : 'aktywuj'}
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Konta aplikacji"
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setServerError(null);
              createForm.reset();
              setShowCreate(true);
            }}
          >
            + Nowe konto
          </button>
        }
      />

      <DataTable columns={columns} items={items} isLoading={isLoading} getRowKey={(u) => u.id} emptyLabel="Brak kont" />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/60">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Nowe konto aplikacji</h2>
            <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
              <TextField label="Imię" registration={createForm.register('imie')} error={createForm.formState.errors.imie} required />
              <TextField label="Nazwisko" registration={createForm.register('nazwisko')} error={createForm.formState.errors.nazwisko} required />
              <TextField label="Login" registration={createForm.register('login')} error={createForm.formState.errors.login} required />
              <TextField label="Hasło" type="password" registration={createForm.register('haslo')} error={createForm.formState.errors.haslo} required />
              <SelectField
                label="Rola"
                registration={createForm.register('rola')}
                options={[
                  { value: 'USER', label: 'user' },
                  { value: 'ADMIN', label: 'admin' },
                ]}
                error={createForm.formState.errors.rola}
              />
              {serverError && <p className="field-error">{serverError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Zapisywanie…' : 'Utwórz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/60">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              Reset hasła — {resetTarget.login}
            </h2>
            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
              <TextField
                label="Nowe hasło"
                type="password"
                registration={resetForm.register('noweHaslo')}
                error={resetForm.formState.errors.noweHaslo}
                required
              />
              {serverError && <p className="field-error">{serverError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setResetTarget(null)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? 'Zapisywanie…' : 'Zresetuj hasło'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

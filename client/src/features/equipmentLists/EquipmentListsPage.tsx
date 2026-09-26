import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { equipmentListCreateSchema, type EquipmentListCreateInput } from 'shared';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { SelectField, TextareaField, TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { departmentsApi } from '../entities';
import { useCreateEquipmentList, useEquipmentLists } from './equipmentLists.hooks';
import type { EquipmentList } from '../../types/entities';

export function EquipmentListsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: items, isLoading } = useEquipmentLists();
  const { data: departments } = departmentsApi.useList();
  const createMutation = useCreateEquipmentList();

  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentListCreateInput>({
    resolver: zodResolver(equipmentListCreateSchema),
    defaultValues: { nazwa: '', dzialId: undefined, opis: '' },
  });

  async function onSubmit(values: EquipmentListCreateInput) {
    try {
      const created = await createMutation.mutateAsync(values);
      setShowForm(false);
      reset();
      navigate(`/equipment-lists/${created.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Nie udało się utworzyć spisu');
    }
  }

  const columns: Column<EquipmentList>[] = [
    { key: 'nazwa', header: 'Nazwa spisu', render: (l) => l.nazwa },
    { key: 'dzial', header: 'Dział', render: (l) => l.dzial?.nazwa ?? '—' },
    { key: 'pozycje', header: 'Pozycje', render: (l) => l._count?.items ?? 0 },
    ...(user?.rola !== 'ADMIN'
      ? [
          {
            key: 'poziom',
            header: 'Twoje uprawnienie',
            render: (l: EquipmentList) => {
              const poziom = l.permissions?.[0]?.poziom;
              return poziom ? (
                <span className={`badge ${poziom === 'EDIT' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {poziom === 'EDIT' ? 'edycja' : 'podgląd'}
                </span>
              ) : (
                '—'
              );
            },
          } satisfies Column<EquipmentList>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Spisy sprzętu"
        actions={
          user?.rola === 'ADMIN' && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setServerError(null);
                reset();
                setShowForm(true);
              }}
            >
              + Nowy spis
            </button>
          )
        }
      />

      <DataTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        getRowKey={(l) => l.id}
        onRowClick={(l) => navigate(`/equipment-lists/${l.id}`)}
        emptyLabel={user?.rola === 'ADMIN' ? 'Brak spisów — utwórz pierwszy' : 'Nie masz dostępu do żadnego spisu'}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 dark:bg-black/60">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Nowy spis sprzętu</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TextField label="Nazwa spisu" registration={register('nazwa')} error={errors.nazwa} required />
              <SelectField
                label="Dział"
                registration={register('dzialId', { valueAsNumber: true })}
                options={(departments ?? []).map((d) => ({ value: String(d.id), label: d.nazwa }))}
                error={errors.dzialId}
                placeholder="Wybierz dział…"
                required
              />
              <TextareaField label="Opis (opcjonalnie)" registration={register('opis')} error={errors.opis} />
              {serverError && <p className="field-error">{serverError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Zapisywanie…' : 'Utwórz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

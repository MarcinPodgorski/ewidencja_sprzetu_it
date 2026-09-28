import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentCreateInput } from 'shared';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { departmentsApi } from '../entities';
import type { Department } from '../../types/entities';

export function DepartmentsPage() {
  const { data: items, isLoading } = departmentsApi.useList();
  const createMutation = departmentsApi.useCreate();
  const updateMutation = departmentsApi.useUpdate();
  const archiveMutation = departmentsApi.useArchive();

  const [editing, setEditing] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentCreateInput>({ resolver: zodResolver(departmentCreateSchema), defaultValues: { nazwa: '' } });

  function openCreate() {
    setEditing(null);
    reset({ nazwa: '' });
    setServerError(null);
    setShowForm(true);
  }

  function openEdit(dep: Department) {
    setEditing(dep);
    reset({ nazwa: dep.nazwa });
    setServerError(null);
    setShowForm(true);
  }

  async function onSubmit(values: DepartmentCreateInput) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setShowForm(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Nie udało się zapisać');
    }
  }

  const columns: Column<Department>[] = [
    { key: 'nazwa', header: 'Nazwa działu', render: (d) => d.nazwa },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <div className="flex justify-end gap-3 text-sm">
          <button type="button" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" onClick={() => openEdit(d)}>
            edytuj
          </button>
          <button type="button" className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300" onClick={() => setConfirmDelete(d)}>
            usuń
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Działy"
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Dodaj dział
          </button>
        }
      />

      <DataTable columns={columns} items={items} isLoading={isLoading} getRowKey={(d) => d.id} emptyLabel="Brak działów" />

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel w-full max-w-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edytuj dział' : 'Nowy dział'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TextField label="Nazwa działu" registration={register('nazwa')} error={errors.nazwa} required />
              {serverError && <p className="field-error">{serverError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Zapisywanie…' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Usunąć dział?"
        description={`Dział "${confirmDelete?.nazwa}" zostanie trwale usunięty. Nie jest to możliwe, jeśli są do niego przypisani pracownicy.`}
        confirmLabel="Usuń"
        danger
        busy={archiveMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) archiveMutation.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) });
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

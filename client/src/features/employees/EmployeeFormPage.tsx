import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeCreateSchema, employeeUpdateSchema, type EmployeeCreateInput } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { SelectField, TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { departmentsApi, employeesApi } from '../entities';

export function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const numId = Number(id);
  const navigate = useNavigate();

  const { data: employee } = employeesApi.useDetail(isEdit ? numId : undefined);
  const { data: departments } = departmentsApi.useList();
  const createMutation = employeesApi.useCreate();
  const updateMutation = employeesApi.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateInput>({
    resolver: zodResolver(isEdit ? employeeUpdateSchema : employeeCreateSchema),
    defaultValues: { imie: '', nazwisko: '', stanowisko: '', email: '', dzialId: undefined },
  });

  useEffect(() => {
    if (employee) {
      reset({
        imie: employee.imie,
        nazwisko: employee.nazwisko,
        stanowisko: employee.stanowisko,
        email: employee.email ?? '',
        dzialId: employee.dzialId,
      });
    }
  }, [employee, reset]);

  async function onSubmit(values: EmployeeCreateInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: numId, data: values });
        navigate(`/employees/${numId}`);
      } else {
        const created = await createMutation.mutateAsync(values);
        navigate(`/employees/${created.id}`);
      }
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Nie udało się zapisać' });
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edycja pracownika' : 'Nowy pracownik'} backTo="/employees" />
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4">
        <TextField label="Imię" registration={register('imie')} error={errors.imie} required />
        <TextField label="Nazwisko" registration={register('nazwisko')} error={errors.nazwisko} required />
        <TextField label="Stanowisko" registration={register('stanowisko')} error={errors.stanowisko} required />
        <TextField
          label="E-mail służbowy (login Microsoft 365)"
          registration={register('email')}
          error={errors.email}
          placeholder="np. jan.nowak@firma.pl"
        />
        <SelectField
          label="Dział"
          registration={register('dzialId', { valueAsNumber: true })}
          options={(departments ?? []).map((d) => ({ value: String(d.id), label: d.nazwa }))}
          error={errors.dzialId}
          placeholder="Wybierz dział…"
          required
        />

        {errors.root && <p className="field-error">{errors.root.message}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/employees')}>
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
}

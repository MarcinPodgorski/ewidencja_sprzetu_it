import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { tonerCreateSchema, tonerUpdateSchema, type TonerCreateInput } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { tonersApi } from '../entities';

export function TonerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const numId = Number(id);
  const navigate = useNavigate();

  const { data: toner } = tonersApi.useDetail(isEdit ? numId : undefined);
  const createMutation = tonersApi.useCreate();
  const updateMutation = tonersApi.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TonerCreateInput>({
    resolver: zodResolver(isEdit ? tonerUpdateSchema : tonerCreateSchema),
    defaultValues: { oznaczenie: '', ilosc: 0 },
  });

  useEffect(() => {
    if (toner) reset(toner);
  }, [toner, reset]);

  async function onSubmit(values: TonerCreateInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: numId, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      navigate('/toners');
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Nie udało się zapisać' });
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title={isEdit ? 'Edycja tonera/tuszu' : 'Nowy toner/tusz'} backTo="/toners" />
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4">
        <TextField label="Oznaczenie" registration={register('oznaczenie')} error={errors.oznaczenie} required />
        <TextField
          label="Ilość (stan magazynowy)"
          type="number"
          registration={register('ilosc', { valueAsNumber: true })}
          error={errors.ilosc}
          required
        />

        {errors.root && <p className="field-error">{errors.root.message}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/toners')}>
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

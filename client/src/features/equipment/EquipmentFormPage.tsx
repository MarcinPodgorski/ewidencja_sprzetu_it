import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { CheckboxField, SelectField, TextField, TextareaField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { groszeToPln, plnToGrosze } from '../../lib/money';
import type { EquipmentLike, EquipmentTypeConfig } from './types';

export function EquipmentFormPage<T extends EquipmentLike>({ config }: { config: EquipmentTypeConfig<T> }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const numId = Number(id);
  const navigate = useNavigate();

  const { data: item } = config.apiHooks.useDetail(isEdit ? numId : undefined);
  const createMutation = config.apiHooks.useCreate();
  const updateMutation = config.apiHooks.useUpdate();

  const schema = isEdit ? config.updateSchema : config.createSchema;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({ resolver: zodResolver(schema), defaultValues: config.defaultValues });

  useEffect(() => {
    if (!item) return;
    const values: Record<string, unknown> = { ...(item as unknown as Record<string, unknown>) };
    for (const f of config.formFields) {
      // <input type="date"> wymaga dokładnie "RRRR-MM-DD" — API zwraca pełny ISO datetime.
      if (f.type === 'date' && typeof values[f.name] === 'string') {
        values[f.name] = (values[f.name] as string).slice(0, 10);
      }
      // Pole edytowane w złotówkach, ale API/baza trzyma grosze (Int) — patrz lib/money.ts.
      if (f.displayFormat === 'money') {
        values[f.name] = groszeToPln(values[f.name]);
      }
    }
    reset(values);
  }, [item, reset, config.formFields]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(values: any) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: numId, data: values });
        navigate(`${config.routeBase}/${numId}`);
      } else {
        const created = await createMutation.mutateAsync(values);
        navigate(`${config.routeBase}/${(created as { id: number }).id}`);
      }
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Nie udało się zapisać' });
    }
  }

  const rootError = (errors as Record<string, { message?: string }>).root;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isEdit ? `Edycja: ${config.singular}` : `Nowy: ${config.singular}`}
        backTo={config.routeBase}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        {config.formFields.map((f) => {
          const registration = register(
            f.name,
            f.displayFormat === 'money'
              ? { setValueAs: plnToGrosze }
              : f.type === 'number'
                ? { valueAsNumber: true }
                : undefined,
          );
          const error = (errors as Record<string, { message?: string }>)[f.name] as
            | { message?: string }
            | undefined;

          if (f.type === 'select') {
            return (
              <SelectField
                key={f.name}
                label={f.label}
                registration={registration}
                options={f.options ?? []}
                error={error as never}
                required={f.required}
                placeholder="Wybierz…"
              />
            );
          }
          if (f.type === 'checkbox') {
            return (
              <div key={f.name} className="sm:col-span-2">
                <CheckboxField label={f.label} registration={registration} />
              </div>
            );
          }
          if (f.type === 'textarea') {
            return (
              <div key={f.name} className="sm:col-span-2">
                <TextareaField
                  label={f.label}
                  registration={registration}
                  error={error as never}
                  placeholder={f.placeholder}
                />
              </div>
            );
          }
          return (
            <TextField
              key={f.name}
              label={f.label}
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              step={f.displayFormat === 'money' ? '0.01' : undefined}
              registration={registration}
              error={error as never}
              placeholder={f.displayFormat === 'money' ? '0.00' : f.placeholder}
              required={f.required}
            />
          );
        })}

        {rootError && <p className="field-error sm:col-span-2">{rootError.message}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(config.routeBase)}>
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

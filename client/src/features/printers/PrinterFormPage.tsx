import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { printerCreateSchema, printerUpdateSchema } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { groszeToPln, plnToGroszeOrNull } from '../../lib/money';
import { printersApi } from '../entities';

/** Pola dat wymagają dokładnie "RRRR-MM-DD" w <input type="date">, API zwraca pełny ISO datetime. */
const DATE_FIELDS = ['dataZakupu', 'dataKoncaGwarancji'] as const;

export function PrinterFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const numId = Number(id);
  const navigate = useNavigate();

  const { data: printer } = printersApi.useDetail(isEdit ? numId : undefined);
  const createMutation = printersApi.useCreate();
  const updateMutation = printersApi.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(isEdit ? printerUpdateSchema : printerCreateSchema),
    defaultValues: {
      numerEwidencyjny: '',
      numerSeryjny: '',
      markaModel: '',
      dzialPietroMiejsce: '',
      adresIP: '',
      mac: '',
      dataZakupu: '',
      dataKoncaGwarancji: '',
      kosztBruttoGrosze: '',
    },
  });

  // `useForm<any>` (patrz wyżej) rozluźnia typ błędów walidacji — pojedynczy cast
  // zamiast rzutowania przy każdym polu z osobna.
  const fieldErrors = errors as Record<string, { message?: string } | undefined>;

  useEffect(() => {
    if (!printer) return;
    const values: Record<string, unknown> = { ...printer };
    for (const field of DATE_FIELDS) {
      if (typeof values[field] === 'string') {
        values[field] = (values[field] as string).slice(0, 10);
      }
    }
    // Pole edytowane w złotówkach, ale API/baza trzyma grosze (Int) — patrz lib/money.ts.
    values.kosztBruttoGrosze = groszeToPln(values.kosztBruttoGrosze);
    reset(values);
  }, [printer, reset]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(values: any) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: numId, data: values });
        navigate(`/printers/${numId}`);
      } else {
        const created = await createMutation.mutateAsync(values);
        navigate(`/printers/${created.id}`);
      }
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Nie udało się zapisać' });
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={isEdit ? 'Edycja: Drukarka' : 'Nowa: Drukarka'} backTo="/printers" />
      <form onSubmit={handleSubmit(onSubmit)} className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Numer ewidencyjny" registration={register('numerEwidencyjny')} error={fieldErrors.numerEwidencyjny as never} required />
        <TextField label="Numer seryjny" registration={register('numerSeryjny')} error={fieldErrors.numerSeryjny as never} required />
        <TextField label="Marka/model" registration={register('markaModel')} error={fieldErrors.markaModel as never} required />
        <TextField
          label="Dział/piętro/miejsce"
          registration={register('dzialPietroMiejsce')}
          error={fieldErrors.dzialPietroMiejsce as never}
          required
        />
        <TextField label="Adres IP" registration={register('adresIP')} error={fieldErrors.adresIP as never} placeholder="192.168.1.10" />
        <TextField label="MAC" registration={register('mac')} error={fieldErrors.mac as never} placeholder="AA:BB:CC:DD:EE:FF" />
        <TextField label="Data zakupu" type="date" registration={register('dataZakupu')} error={fieldErrors.dataZakupu as never} />
        <TextField
          label="Data końca gwarancji"
          type="date"
          registration={register('dataKoncaGwarancji')}
          error={fieldErrors.dataKoncaGwarancji as never}
        />
        <TextField
          label="Koszt brutto (zł)"
          type="number"
          step="0.01"
          placeholder="0.00"
          registration={register('kosztBruttoGrosze', { setValueAs: plnToGroszeOrNull })}
          error={fieldErrors.kosztBruttoGrosze as never}
        />

        {errors.root && <p className="field-error sm:col-span-2">{errors.root.message}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/printers')}>
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

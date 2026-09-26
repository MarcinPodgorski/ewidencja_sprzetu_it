import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { fakturaCreateSchema, fakturaUpdateSchema, type EquipmentType } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/form/fields';
import { ApiError } from '../../lib/api';
import { groszeToPln, plnToGrosze } from '../../lib/money';
import { EquipmentMultiPicker, type PickedEquipment } from './EquipmentMultiPicker';
import { useCreateFaktura, useFaktura, useUpdateFaktura } from './faktury.hooks';

/** Walidacja pól tekstowych faktury — `pozycje` jest wyłączone stąd celowo, bo w tym
 *  formularzu żyje jako osobny stan (EquipmentMultiPicker), nie jako input RHF;
 *  sprawdzane ręcznie w onSubmit, żeby dać dokładny komunikat błędu. */
const createFieldsSchema = fakturaCreateSchema.omit({ pozycje: true });
const updateFieldsSchema = fakturaUpdateSchema.omit({ pozycje: true });

export function FakturaFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const numId = Number(id);
  const navigate = useNavigate();

  const { data: faktura } = useFaktura(isEdit ? numId : undefined);
  const createMutation = useCreateFaktura();
  const updateMutation = useUpdateFaktura();

  const [pozycje, setPozycje] = useState<PickedEquipment[]>([]);
  const [plikPdf, setPlikPdf] = useState<File | null>(null);
  const [plikXml, setPlikXml] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(isEdit ? updateFieldsSchema : createFieldsSchema),
    defaultValues: { numer: '', numerKsef: '', kwotaGrosze: '' },
  });

  useEffect(() => {
    if (!faktura) return;
    reset({
      numer: faktura.numer,
      numerKsef: faktura.numerKsef ?? '',
      kwotaGrosze: groszeToPln(faktura.kwotaGrosze),
    });
    setPozycje(
      faktura.pozycje
        .filter((p) => p.sprzet)
        .map((p) => ({
          sprzetTyp: p.sprzetTyp as EquipmentType,
          sprzetId: p.sprzetId,
          identyfikator: p.sprzet!.identyfikator,
          opis: p.sprzet!.opis,
        })),
    );
  }, [faktura, reset]);

  function addPozycja(item: PickedEquipment) {
    setPozycje((prev) => [...prev, item]);
  }

  function removePozycja(sprzetTyp: EquipmentType, sprzetId: number) {
    setPozycje((prev) => prev.filter((p) => !(p.sprzetTyp === sprzetTyp && p.sprzetId === sprzetId)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(values: any) {
    if (pozycje.length === 0) {
      setError('root', { message: 'Wybierz co najmniej jedną sztukę sprzętu' });
      return;
    }

    const formData = new FormData();
    formData.set('numer', values.numer);
    if (values.numerKsef) formData.set('numerKsef', values.numerKsef);
    if (values.kwotaGrosze !== undefined && values.kwotaGrosze !== null) {
      formData.set('kwotaGrosze', String(values.kwotaGrosze));
    }
    formData.set('pozycje', JSON.stringify(pozycje.map(({ sprzetTyp, sprzetId }) => ({ sprzetTyp, sprzetId }))));
    if (plikPdf) formData.set('plikPdf', plikPdf);
    if (plikXml) formData.set('plikXml', plikXml);

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: numId, formData });
        navigate(`/faktury/${numId}`);
      } else {
        const created = await createMutation.mutateAsync(formData);
        navigate(`/faktury/${created.id}`);
      }
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Nie udało się zapisać' });
    }
  }

  const fieldErrors = errors as Record<string, { message?: string } | undefined>;
  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl">
      <PageHeader title={isEdit ? 'Edycja: Faktura' : 'Nowa: Faktura'} backTo="/faktury" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Numer faktury" registration={register('numer')} error={fieldErrors.numer as never} required />
          <TextField
            label="Numer KSeF"
            registration={register('numerKsef')}
            error={fieldErrors.numerKsef as never}
            placeholder="opcjonalnie"
          />
          <TextField
            label="Kwota (zł)"
            type="number"
            step="0.01"
            placeholder="0.00"
            registration={register('kwotaGrosze', { setValueAs: plnToGrosze })}
            error={fieldErrors.kwotaGrosze as never}
            required
          />

          <div>
            <label className="label">Załącznik PDF</label>
            <input
              type="file"
              accept="application/pdf"
              className="input"
              onChange={(e) => setPlikPdf(e.target.files?.[0] ?? null)}
            />
            {faktura?.plikPdf && !plikPdf && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Załącznik już dodany — wybierz nowy plik, aby go zastąpić.
              </p>
            )}
          </div>
          <div>
            <label className="label">Załącznik XML</label>
            <input
              type="file"
              accept=".xml,application/xml,text/xml"
              className="input"
              onChange={(e) => setPlikXml(e.target.files?.[0] ?? null)}
            />
            {faktura?.plikXml && !plikXml && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Załącznik już dodany — wybierz nowy plik, aby go zastąpić.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Sprzęt objęty fakturą</h2>
          <EquipmentMultiPicker selected={pozycje} onAdd={addPozycja} onRemove={removePozycja} />
        </div>

        {errors.root && <p className="field-error">{(errors.root as { message?: string }).message}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/faktury')}>
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
}

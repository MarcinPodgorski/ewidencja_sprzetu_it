import { useState } from 'react';
import { PHONE_TYPE_LABELS, PHONE_TYPES, phoneCreateSchema, phoneUpdateSchema } from 'shared';
import type { Column } from '../../components/DataTable';
import { StatusBadge, UserBadge } from '../../components/StatusBadge';
import { phonesApi, simCardsApi } from '../entities';
import type { Phone } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';

const typeOptions = PHONE_TYPES.map((t) => ({ value: t, label: PHONE_TYPE_LABELS[t] }));

const columns: Column<Phone>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (p) => p.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (p) => p.markaModel },
  { key: 'typ', header: 'Typ', render: (p) => PHONE_TYPE_LABELS[p.typ] },
  { key: 'uzytkownik', header: 'Użytkownik', render: (p) => <UserBadge user={p.aktualnyUzytkownik} /> },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge wycofany={p.wycofany} /> },
];

function PhoneDetailExtra({ item }: { item: Phone }) {
  const { data: linkedSim } = simCardsApi.useDetail(item.simCardId ?? undefined);
  const { data: allSims } = simCardsApi.useList({ wycofany: false });
  const { data: allPhones } = phonesApi.useList({ wycofany: false });
  const updateMutation = phonesApi.useUpdate();
  const [selected, setSelected] = useState('');

  const usedSimIds = new Set((allPhones ?? []).filter((p) => p.id !== item.id).map((p) => p.simCardId));
  const candidates = (allSims ?? []).filter((s) => !usedSimIds.has(s.id) && s.id !== item.simCardId);

  return (
    <div className="card mt-6 max-w-lg">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Karta SIM</h2>
      {item.simCardId ? (
        <div className="space-y-3">
          {linkedSim ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Przypisana karta: <span className="font-medium">{linkedSim.numerTelefonu}</span> (ICCID:{' '}
              {linkedSim.iccid})
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie danych karty…</p>
          )}
          <button
            type="button"
            className="btn-secondary"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate({ id: item.id, data: { simCardId: null } })}
          >
            Odepnij kartę
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ten telefon nie ma przypisanej karty SIM.</p>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Wybierz kartę SIM…</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.numerTelefonu} (ICCID: {s.iccid})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            disabled={!selected || updateMutation.isPending}
            onClick={() => {
              updateMutation.mutate({ id: item.id, data: { simCardId: Number(selected) } });
              setSelected('');
            }}
          >
            Przypisz kartę
          </button>
        </div>
      )}
    </div>
  );
}

export const phoneConfig: EquipmentTypeConfig<Phone> = {
  apiHooks: phonesApi,
  sprzetTyp: 'TELEFON',
  singular: 'Telefon',
  plural: 'Telefony',
  routeBase: '/phones',
  columns,
  createSchema: phoneCreateSchema,
  updateSchema: phoneUpdateSchema,
  identifier: (p) => p.numerEwidencyjny,
  defaultValues: {
    numerEwidencyjny: '',
    numerSeryjny: '',
    markaModel: '',
    typ: 'SMARTFON',
    imei: '',
    kodOdblokowania: '',
    dataZakupu: '',
    dataKoncaGwarancji: '',
    kosztBruttoGrosze: '',
  },
  formFields: [
    { name: 'numerEwidencyjny', label: 'Numer ewidencyjny', type: 'text', required: true },
    { name: 'numerSeryjny', label: 'Numer seryjny', type: 'text', required: true },
    { name: 'markaModel', label: 'Marka/model', type: 'text', required: true },
    { name: 'typ', label: 'Typ', type: 'select', options: typeOptions, required: true },
    { name: 'imei', label: 'IMEI', type: 'text', required: true },
    {
      name: 'kodOdblokowania',
      label: 'Kod odblokowania (kiosk mode)',
      type: 'text',
      placeholder: 'jeśli dotyczy',
      sensitive: true,
    },
    { name: 'dataZakupu', label: 'Data zakupu', type: 'date' },
    { name: 'dataKoncaGwarancji', label: 'Data końca gwarancji', type: 'date' },
    { name: 'kosztBruttoGrosze', label: 'Koszt brutto (zł)', type: 'number', displayFormat: 'money' },
  ],
  DetailExtra: PhoneDetailExtra,
  extraFilters: [{ field: 'typ', label: 'Typ', options: typeOptions }],
};

import { keyboardCreateSchema, keyboardUpdateSchema } from 'shared';
import type { Column } from '../../components/DataTable';
import { StatusBadge, UserBadge } from '../../components/StatusBadge';
import { PeripheralPairPanel } from '../../components/PeripheralPairPanel';
import { keyboardsApi, miceApi } from '../entities';
import { usePairMouseWithKeyboard, useUnpairKeyboard } from './pairing.hooks';
import type { Keyboard } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';

const columns: Column<Keyboard>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (k) => k.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (k) => k.markaModel },
  {
    key: 'zestaw',
    header: 'Zestaw',
    render: (k) => (k.czyZestaw ? <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">tak</span> : '—'),
  },
  { key: 'uzytkownik', header: 'Użytkownik', render: (k) => <UserBadge user={k.aktualnyUzytkownik} /> },
  { key: 'status', header: 'Status', render: (k) => <StatusBadge wycofany={k.wycofany} /> },
];

function KeyboardDetailExtra({ item }: { item: Keyboard }) {
  const { data: mice } = miceApi.useList({ wycofany: false });
  const pairMutation = usePairMouseWithKeyboard();
  const unpairMutation = useUnpairKeyboard();

  const candidates = mice?.filter((m) => !m.czyZestaw) ?? [];

  return (
    <PeripheralPairPanel
      pairedWith={item.pair?.mouse ?? null}
      candidates={candidates}
      otherLabel="mysz"
      busy={pairMutation.isPending || unpairMutation.isPending}
      onPair={(mouseId) => pairMutation.mutate({ mouseId, keyboardId: item.id })}
      onUnpair={() => unpairMutation.mutate(item.id)}
    />
  );
}

export const keyboardConfig: EquipmentTypeConfig<Keyboard> = {
  apiHooks: keyboardsApi,
  sprzetTyp: 'KLAWIATURA',
  singular: 'Klawiatura',
  plural: 'Klawiatury',
  routeBase: '/keyboards',
  columns,
  createSchema: keyboardCreateSchema,
  updateSchema: keyboardUpdateSchema,
  identifier: (k) => k.numerEwidencyjny,
  defaultValues: { numerEwidencyjny: '', numerSeryjny: '', markaModel: '', czyZestaw: false },
  formFields: [
    { name: 'numerEwidencyjny', label: 'Numer ewidencyjny', type: 'text', required: true },
    { name: 'numerSeryjny', label: 'Numer seryjny', type: 'text', required: true },
    { name: 'markaModel', label: 'Marka/model', type: 'text', required: true },
  ],
  DetailExtra: KeyboardDetailExtra,
  extraFilters: [
    {
      field: 'czyZestaw',
      label: 'Zestaw',
      options: [
        { value: 'true', label: 'Tak' },
        { value: 'false', label: 'Nie' },
      ],
    },
  ],
};

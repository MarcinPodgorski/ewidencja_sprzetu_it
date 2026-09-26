import { mouseCreateSchema, mouseUpdateSchema } from 'shared';
import type { Column } from '../../components/DataTable';
import { StatusBadge, UserBadge } from '../../components/StatusBadge';
import { PeripheralPairPanel } from '../../components/PeripheralPairPanel';
import { keyboardsApi, miceApi } from '../entities';
import { usePairMouseWithKeyboard, useUnpairMouse } from './pairing.hooks';
import type { Mouse } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';

const columns: Column<Mouse>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (m) => m.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (m) => m.markaModel },
  {
    key: 'zestaw',
    header: 'Zestaw',
    render: (m) => (m.czyZestaw ? <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">tak</span> : '—'),
  },
  { key: 'uzytkownik', header: 'Użytkownik', render: (m) => <UserBadge user={m.aktualnyUzytkownik} /> },
  { key: 'status', header: 'Status', render: (m) => <StatusBadge wycofany={m.wycofany} /> },
];

function MouseDetailExtra({ item }: { item: Mouse }) {
  const { data: keyboards } = keyboardsApi.useList({ wycofany: false });
  const pairMutation = usePairMouseWithKeyboard();
  const unpairMutation = useUnpairMouse();

  const candidates = keyboards?.filter((k) => !k.czyZestaw) ?? [];

  return (
    <PeripheralPairPanel
      pairedWith={item.pair?.keyboard ?? null}
      candidates={candidates}
      otherLabel="klawiaturę"
      busy={pairMutation.isPending || unpairMutation.isPending}
      onPair={(keyboardId) => pairMutation.mutate({ mouseId: item.id, keyboardId })}
      onUnpair={() => unpairMutation.mutate(item.id)}
    />
  );
}

export const mouseConfig: EquipmentTypeConfig<Mouse> = {
  apiHooks: miceApi,
  sprzetTyp: 'MYSZ',
  singular: 'Mysz',
  plural: 'Myszy',
  routeBase: '/mice',
  columns,
  createSchema: mouseCreateSchema,
  updateSchema: mouseUpdateSchema,
  identifier: (m) => m.numerEwidencyjny,
  defaultValues: { numerEwidencyjny: '', numerSeryjny: '', markaModel: '', czyZestaw: false },
  formFields: [
    { name: 'numerEwidencyjny', label: 'Numer ewidencyjny', type: 'text', required: true },
    { name: 'numerSeryjny', label: 'Numer seryjny', type: 'text', required: true },
    { name: 'markaModel', label: 'Marka/model', type: 'text', required: true },
  ],
  DetailExtra: MouseDetailExtra,
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

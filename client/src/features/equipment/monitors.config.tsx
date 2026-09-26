import { monitorCreateSchema, monitorUpdateSchema } from 'shared';
import type { Column } from '../../components/DataTable';
import { StatusBadge, UserBadge } from '../../components/StatusBadge';
import { monitorsApi } from '../entities';
import type { Monitor } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';

const columns: Column<Monitor>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (m) => m.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (m) => m.markaModel },
  { key: 'wielkosc', header: 'Wielkość', render: (m) => `${m.wielkoscEkranu}"` },
  { key: 'uzytkownik', header: 'Użytkownik', render: (m) => <UserBadge user={m.aktualnyUzytkownik} /> },
  { key: 'status', header: 'Status', render: (m) => <StatusBadge wycofany={m.wycofany} /> },
];

export const monitorConfig: EquipmentTypeConfig<Monitor> = {
  apiHooks: monitorsApi,
  sprzetTyp: 'MONITOR',
  singular: 'Monitor',
  plural: 'Monitory',
  routeBase: '/monitors',
  columns,
  createSchema: monitorCreateSchema,
  updateSchema: monitorUpdateSchema,
  identifier: (m) => m.numerEwidencyjny,
  defaultValues: {
    numerEwidencyjny: '',
    numerSeryjny: '',
    markaModel: '',
    zlacza: '',
    proporcjeEkranu: '16:9',
    wielkoscEkranu: 24,
  },
  formFields: [
    { name: 'numerEwidencyjny', label: 'Numer ewidencyjny', type: 'text', required: true },
    { name: 'numerSeryjny', label: 'Numer seryjny', type: 'text', required: true },
    { name: 'markaModel', label: 'Marka/model', type: 'text', required: true },
    { name: 'zlacza', label: 'Złącza', type: 'text', required: true, placeholder: 'np. HDMI, DisplayPort, VGA' },
    { name: 'proporcjeEkranu', label: 'Proporcje ekranu', type: 'text', required: true, placeholder: 'np. 16:9' },
    { name: 'wielkoscEkranu', label: 'Wielkość ekranu (cale)', type: 'number', required: true },
  ],
};

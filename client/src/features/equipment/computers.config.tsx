import {
  COMPUTER_TYPE_LABELS,
  COMPUTER_TYPES,
  RAM_TYPES,
  SYSTEM_OPERACYJNY_LABELS,
  SYSTEMY_OPERACYJNE,
  computerCreateSchema,
  computerUpdateSchema,
  type SystemOperacyjny,
} from 'shared';
import type { Column } from '../../components/DataTable';
import { SystemBadge } from '../../components/OsIcon';
import { StatusBadge, UserBadge } from '../../components/StatusBadge';
import { computersApi } from '../entities';
import type { Computer } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';
import { ComputerOnboardingPanel } from '../onboarding/ComputerOnboardingPanel';

const typeOptions = COMPUTER_TYPES.map((t) => ({ value: t, label: COMPUTER_TYPE_LABELS[t] }));
const ramOptions = RAM_TYPES.map((t) => ({ value: t, label: t === 'INNY' ? 'Inny' : t }));
const systemOptions = SYSTEMY_OPERACYJNE.map((s) => ({ value: s, label: SYSTEM_OPERACYJNY_LABELS[s] }));

const columns: Column<Computer>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (c) => c.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (c) => c.markaModel },
  { key: 'typ', header: 'Typ', render: (c) => COMPUTER_TYPE_LABELS[c.typ] },
  {
    key: 'system',
    header: 'System',
    render: (c) => <SystemBadge system={c.systemOperacyjny} wersja={c.wersjaSystemu} />,
  },
  { key: 'uzytkownik', header: 'Użytkownik', render: (c) => <UserBadge user={c.aktualnyUzytkownik} /> },
  { key: 'status', header: 'Status', render: (c) => <StatusBadge wycofany={c.wycofany} /> },
];

export const computerConfig: EquipmentTypeConfig<Computer> = {
  apiHooks: computersApi,
  sprzetTyp: 'KOMPUTER',
  singular: 'Komputer',
  plural: 'Komputery',
  routeBase: '/computers',
  columns,
  createSchema: computerCreateSchema,
  updateSchema: computerUpdateSchema,
  identifier: (c) => c.numerEwidencyjny,
  defaultValues: {
    numerEwidencyjny: '',
    numerSeryjny: '',
    typ: 'LAPTOP',
    cpu: '',
    ramIloscGb: 8,
    ramRodzaj: 'DDR4',
    markaModel: '',
    pojemnoscDysku: '',
    systemOperacyjny: '',
    wersjaSystemu: '',
    macEthernet: '',
    macWifi: '',
    notatki: '',
    dataZakupu: '',
    dataKoncaGwarancji: '',
    kosztBruttoGrosze: '',
  },
  formFields: [
    { name: 'numerEwidencyjny', label: 'Numer ewidencyjny', type: 'text', required: true, placeholder: 'np. KOMP-001' },
    { name: 'numerSeryjny', label: 'Numer seryjny', type: 'text', required: true },
    { name: 'typ', label: 'Typ', type: 'select', options: typeOptions, required: true },
    { name: 'markaModel', label: 'Marka/model', type: 'text', required: true },
    { name: 'cpu', label: 'CPU', type: 'text', required: true },
    { name: 'ramIloscGb', label: 'RAM (GB)', type: 'number', required: true },
    { name: 'ramRodzaj', label: 'Rodzaj RAM', type: 'select', options: ramOptions, required: true },
    { name: 'pojemnoscDysku', label: 'Pojemność dysku', type: 'text', required: true, placeholder: 'np. 512GB SSD' },
    {
      name: 'systemOperacyjny',
      label: 'System operacyjny',
      type: 'select',
      options: systemOptions,
      renderDetail: (v) => <SystemBadge system={(v ?? null) as SystemOperacyjny | null} />,
    },
    { name: 'wersjaSystemu', label: 'Wersja systemu', type: 'text', placeholder: 'np. 24H2, Ubuntu 24.04 LTS' },
    { name: 'macEthernet', label: 'MAC (Ethernet)', type: 'text', placeholder: 'AA:BB:CC:DD:EE:FF' },
    { name: 'macWifi', label: 'MAC (WiFi)', type: 'text', placeholder: 'AA:BB:CC:DD:EE:FF' },
    { name: 'dataZakupu', label: 'Data zakupu', type: 'date' },
    { name: 'dataKoncaGwarancji', label: 'Data końca gwarancji', type: 'date' },
    { name: 'kosztBruttoGrosze', label: 'Koszt brutto (zł)', type: 'number', displayFormat: 'money' },
    { name: 'notatki', label: 'Notatki', type: 'textarea' },
  ],
  DetailExtra: ComputerOnboardingPanel,
  extraFilters: [
    { field: 'typ', label: 'Typ', options: typeOptions },
    { field: 'ramRodzaj', label: 'RAM', options: ramOptions },
    { field: 'systemOperacyjny', label: 'System', options: systemOptions },
  ],
};

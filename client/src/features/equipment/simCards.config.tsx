import { simCardCreateSchema, simCardUpdateSchema } from 'shared';
import type { Column } from '../../components/DataTable';
import { UserBadge } from '../../components/StatusBadge';
import { simCardsApi } from '../entities';
import type { SimCard } from '../../types/entities';
import type { EquipmentTypeConfig } from './types';

function formatMoney(grosze: number): string {
  return `${(grosze / 100).toFixed(2)} zł`;
}

const columns: Column<SimCard>[] = [
  { key: 'numerTelefonu', header: 'Numer telefonu', render: (s) => s.numerTelefonu },
  { key: 'iccid', header: 'ICCID', render: (s) => s.iccid },
  { key: 'taryfa', header: 'Taryfa', render: (s) => s.taryfa },
  { key: 'koszt', header: 'Koszt/mies.', render: (s) => formatMoney(s.kosztMiesiecznyGrosze) },
  { key: 'uzytkownik', header: 'Użytkownik', render: (s) => <UserBadge user={s.aktualnyUzytkownik} /> },
];

export const simCardConfig: EquipmentTypeConfig<SimCard> = {
  apiHooks: simCardsApi,
  sprzetTyp: 'KARTA_SIM',
  singular: 'Karta SIM',
  plural: 'Karty SIM',
  routeBase: '/sim-cards',
  columns,
  createSchema: simCardCreateSchema,
  updateSchema: simCardUpdateSchema,
  identifier: (s) => s.numerTelefonu,
  defaultValues: {
    iccid: '',
    numerTelefonu: '',
    pin1: '',
    pin2: '',
    puk1: '',
    puk2: '',
    taryfa: '',
    kosztMiesiecznyGrosze: 0,
    dataKoncaUmowy: '',
  },
  formFields: [
    { name: 'iccid', label: 'ICCID', type: 'text', required: true },
    { name: 'numerTelefonu', label: 'Numer telefonu', type: 'text', required: true },
    { name: 'taryfa', label: 'Taryfa', type: 'text', required: true },
    {
      name: 'kosztMiesiecznyGrosze',
      label: 'Koszt miesięczny (zł)',
      type: 'number',
      required: true,
      displayFormat: 'money',
    },
    { name: 'dataKoncaUmowy', label: 'Data końca umowy', type: 'date', required: true },
    { name: 'pin1', label: 'PIN 1', type: 'text', sensitive: true },
    { name: 'pin2', label: 'PIN 2', type: 'text', sensitive: true },
    { name: 'puk1', label: 'PUK 1', type: 'text', sensitive: true },
    { name: 'puk2', label: 'PUK 2', type: 'text', sensitive: true },
  ],
};

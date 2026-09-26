import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { printersApi } from '../entities';
import type { Printer } from '../../types/entities';

type StatusFilter = 'active' | 'inactive' | 'all';

const baseColumns: Column<Printer>[] = [
  { key: 'numerEwidencyjny', header: 'Nr ewidencyjny', render: (p) => p.numerEwidencyjny },
  { key: 'markaModel', header: 'Marka/model', render: (p) => p.markaModel },
  { key: 'lokalizacja', header: 'Lokalizacja', render: (p) => p.dzialPietroMiejsce },
  { key: 'ip', header: 'Adres IP', render: (p) => p.adresIP ?? '—' },
  {
    key: 'tonery',
    header: 'Tonery/tusze',
    render: (p) => (p.tonery && p.tonery.length > 0 ? p.tonery.map((t) => t.toner.oznaczenie).join(', ') : '—'),
  },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge wycofany={p.wycofany} /> },
];

export function PrintersListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const { data: items, isLoading } = printersApi.useList({
    q: q || undefined,
    wycofany: status === 'all' ? undefined : status === 'inactive',
  });

  const archiveMutation = printersApi.useArchive();
  const restoreMutation = printersApi.useRestore();

  const columns: Column<Printer>[] = [
    ...baseColumns,
    {
      key: 'akcje',
      header: '',
      className: 'text-right',
      render: (p) => (
        <button
          type="button"
          className={
            p.wycofany
              ? 'text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
              : 'text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300'
          }
          disabled={archiveMutation.isPending || restoreMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            if (p.wycofany) restoreMutation.mutate(p.id);
            else archiveMutation.mutate(p.id);
          }}
        >
          {p.wycofany ? 'przywróć' : 'wycofaj'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Drukarki"
        actions={
          <button type="button" className="btn-primary" onClick={() => navigate('/printers/new')}>
            + Dodaj
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Szukaj…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input max-w-xs"
        />
        <select
          className="input max-w-[10rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="active">Aktywne</option>
          <option value="inactive">Nieaktywne</option>
          <option value="all">Wszystkie</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/printers/${p.id}`)}
        emptyLabel="Brak drukarek"
      />
    </div>
  );
}

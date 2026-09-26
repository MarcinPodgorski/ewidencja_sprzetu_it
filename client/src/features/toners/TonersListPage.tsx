import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { tonersApi } from '../entities';
import type { Toner } from '../../types/entities';

const columns: Column<Toner>[] = [
  { key: 'oznaczenie', header: 'Oznaczenie', render: (t) => t.oznaczenie },
  {
    key: 'ilosc',
    header: 'Stan magazynowy',
    render: (t) => (
      <span className={t.ilosc === 0 ? 'font-medium text-red-600 dark:text-red-400' : t.ilosc <= 2 ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
        {t.ilosc} szt.
      </span>
    ),
  },
  {
    key: 'drukarki',
    header: 'Pasuje do drukarek',
    render: (t) => (t.drukarki && t.drukarki.length > 0 ? t.drukarki.map((d) => d.printer.numerEwidencyjny).join(', ') : '—'),
  },
];

export function TonersListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: items, isLoading } = tonersApi.useList({ q: q || undefined, niskiStan: lowStockOnly || undefined });

  return (
    <div>
      <PageHeader
        title="Tonery/tusze"
        actions={
          <button type="button" className="btn-primary" onClick={() => navigate('/toners/new')}>
            + Dodaj
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Szukaj po oznaczeniu…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
          />
          Tylko niski stan
        </label>
      </div>

      <DataTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        getRowKey={(t) => t.id}
        onRowClick={(t) => navigate(`/toners/${t.id}/edit`)}
        emptyLabel="Brak tonerów/tuszy w ewidencji"
      />
    </div>
  );
}

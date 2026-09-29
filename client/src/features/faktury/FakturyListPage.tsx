import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { useFaktury, type Faktura } from './faktury.hooks';

function formatMoney(grosze: number): string {
  return `${(grosze / 100).toFixed(2)} zł`;
}

const columns: Column<Faktura>[] = [
  { key: 'numer', header: 'Numer', render: (f) => f.numer },
  { key: 'numerKsef', header: 'Numer KSeF', render: (f) => f.numerKsef ?? '—' },
  { key: 'kwota', header: 'Kwota', render: (f) => formatMoney(f.kwotaGrosze) },
  { key: 'pozycje', header: 'Sprzęt', render: (f) => `${f.pozycje.length} szt.` },
  {
    key: 'zalaczniki',
    header: 'Załączniki',
    render: (f) => [f.plikPdf && 'PDF', f.plikXml && 'XML'].filter(Boolean).join(', ') || '—',
  },
];

export function FakturyListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data: items, isLoading } = useFaktury(q);

  return (
    <div>
      <PageHeader
        title="Faktury"
        actions={
          <button type="button" className="btn-primary" onClick={() => navigate('/faktury/new')}>
            + Dodaj
          </button>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Szukaj po numerze / numerze KSeF…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input col-span-2 sm:max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        getRowKey={(f) => f.id}
        onRowClick={(f) => navigate(`/faktury/${f.id}`)}
        emptyLabel="Brak faktur w ewidencji"
      />
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { departmentsApi, employeesApi } from '../entities';
import type { Employee } from '../../types/entities';

type StatusFilter = 'active' | 'inactive' | 'all';

const columns: Column<Employee>[] = [
  { key: 'nazwisko', header: 'Nazwisko i imię', render: (e) => `${e.nazwisko} ${e.imie}` },
  { key: 'stanowisko', header: 'Stanowisko', render: (e) => e.stanowisko },
  { key: 'dzial', header: 'Dział', render: (e) => e.dzial?.nazwa ?? '—' },
  { key: 'status', header: 'Status', render: (e) => <StatusBadge wycofany={!e.aktywny} /> },
];

export function EmployeesListPage() {
  const navigate = useNavigate();
  const { data: departments } = departmentsApi.useList();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [dzialId, setDzialId] = useState('');

  const { data: items, isLoading } = employeesApi.useList({
    q: q || undefined,
    aktywny: status === 'all' ? 'all' : status === 'active',
    dzialId: dzialId || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Pracownicy"
        actions={
          <button type="button" className="btn-primary" onClick={() => navigate('/employees/new')}>
            + Dodaj
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <input
          type="text"
          placeholder="Szukaj po imieniu i nazwisku…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input col-span-2 sm:max-w-xs"
        />
        <select
          className="input sm:max-w-[10rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="active">Aktywni</option>
          <option value="inactive">Nieaktywni</option>
          <option value="all">Wszyscy</option>
        </select>
        <select className="input sm:max-w-[12rem]" value={dzialId} onChange={(e) => setDzialId(e.target.value)}>
          <option value="">Wszystkie działy</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nazwa}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        items={items}
        isLoading={isLoading}
        getRowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/employees/${e.id}`)}
        emptyLabel="Brak pracowników"
      />
    </div>
  );
}

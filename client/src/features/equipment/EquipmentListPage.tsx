import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { departmentsApi } from '../entities';
import type { EquipmentTypeConfig } from './types';

type StatusFilter = 'active' | 'inactive' | 'all';
type AssignmentFilter = 'all' | 'assigned' | 'unassigned';

export function EquipmentListPage<T extends { id: number; wycofany: boolean }>({
  config,
}: {
  config: EquipmentTypeConfig<T>;
}) {
  const navigate = useNavigate();
  const { data: departments } = departmentsApi.useList();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [assignment, setAssignment] = useState<AssignmentFilter>('all');
  const [dzialId, setDzialId] = useState('');
  const [extraFilters, setExtraFilters] = useState<Record<string, string>>({});

  const { data: items, isLoading } = config.apiHooks.useList({
    q: q || undefined,
    wycofany: status === 'all' ? undefined : status === 'inactive',
    przypisanie: assignment === 'all' ? undefined : assignment,
    dzialId: dzialId || undefined,
    ...Object.fromEntries(Object.entries(extraFilters).filter(([, v]) => v !== '')),
  });

  const archiveMutation = config.apiHooks.useArchive();
  const restoreMutation = config.apiHooks.useRestore();

  const columnsWithActions: Column<T>[] = [
    ...config.columns,
    {
      key: 'akcje',
      header: '',
      className: 'text-right',
      render: (item) => (
        <button
          type="button"
          className={
            item.wycofany
              ? 'text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
              : 'text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300'
          }
          disabled={archiveMutation.isPending || restoreMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            if (item.wycofany) restoreMutation.mutate(item.id);
            else archiveMutation.mutate(item.id);
          }}
        >
          {item.wycofany ? 'przywróć' : 'wycofaj'}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={config.plural}
        actions={
          <button type="button" className="btn-primary" onClick={() => navigate(`${config.routeBase}/new`)}>
            + Dodaj
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
          <option value="all">Wszystkie statusy</option>
        </select>
        <select
          className="input max-w-[12rem]"
          value={assignment}
          onChange={(e) => setAssignment(e.target.value as AssignmentFilter)}
        >
          <option value="all">Wszyscy użytkownicy</option>
          <option value="assigned">Przypisany</option>
          <option value="unassigned">Nieprzypisany</option>
        </select>
        <select className="input max-w-[12rem]" value={dzialId} onChange={(e) => setDzialId(e.target.value)}>
          <option value="">Wszystkie działy</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nazwa}
            </option>
          ))}
        </select>
        {config.extraFilters?.map((filter) => (
          <select
            key={filter.field}
            className="input max-w-[12rem]"
            value={extraFilters[filter.field] ?? ''}
            onChange={(e) => setExtraFilters((prev) => ({ ...prev, [filter.field]: e.target.value }))}
          >
            <option value="">{filter.label}: wszystkie</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      <DataTable
        columns={columnsWithActions}
        items={items}
        isLoading={isLoading}
        getRowKey={(item) => item.id}
        onRowClick={(item) => navigate(`${config.routeBase}/${item.id}`)}
        emptyLabel={`Brak pozycji: ${config.plural.toLowerCase()}`}
      />
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../lib/api';
import type { Inwentaryzacja } from '../../types/entities';
import { departmentsApi } from '../entities';
import { formatujDate } from '../onboarding/utils';
import { useInwentaryzacje, useUtworzInwentaryzacje } from './inwentaryzacje.hooks';
import { PasekPostepu, StatusInwentaryzacjiBadge } from './utils';

const kolumny: Column<Inwentaryzacja>[] = [
  { key: 'nazwa', header: 'Nazwa', render: (i) => <span className="font-medium text-gray-900 dark:text-gray-100">{i.nazwa}</span> },
  { key: 'zakres', header: 'Zakres', render: (i) => (i.dzial ? `dział ${i.dzial.nazwa}` : 'cała firma') },
  { key: 'status', header: 'Status', render: (i) => <StatusInwentaryzacjiBadge status={i.status} /> },
  {
    key: 'postep',
    header: 'Postęp',
    className: 'min-w-[12rem]',
    render: (i) => <PasekPostepu potwierdzone={i.liczbaPotwierdzonych} wszystkie={i.liczbaPozycji} spozaListy={i.liczbaSpozaListy} />,
  },
  { key: 'start', header: 'Rozpoczęta', className: 'whitespace-nowrap', render: (i) => formatujDate(i.createdAt) },
];

export function InwentaryzacjePage() {
  const navigate = useNavigate();
  const { data: lista, isLoading } = useInwentaryzacje();
  const { data: dzialy } = departmentsApi.useList();
  const utworz = useUtworzInwentaryzacje();
  const [nazwa, setNazwa] = useState(`Spis z natury ${new Date().getFullYear()}`);
  const [dzialId, setDzialId] = useState('');
  const [blad, setBlad] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBlad(null);
    try {
      const nowa = await utworz.mutateAsync({ nazwa: nazwa.trim(), dzialId: dzialId ? Number(dzialId) : null });
      navigate(`/inwentaryzacje/${nowa.id}`);
    } catch (err) {
      setBlad(err instanceof ApiError ? err.message : 'Nie udało się rozpocząć inwentaryzacji');
    }
  }

  return (
    <div>
      <PageHeader
        title="Inwentaryzacja"
        subtitle="Spis z natury — potwierdzanie obecności sprzętu skanem naklejki QR telefonem albo z listy"
      />

      <form onSubmit={onSubmit} className="card mb-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Nowa inwentaryzacja</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Aplikacja zapamięta listę sprzętu, który powinien się znaleźć (aktywny sprzęt z numerem ewidencyjnym). Naklejki z kodami
          wydrukujesz w{' '}
          <Link to="/etykiety" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Etykietach QR
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="label" htmlFor="nazwa">
              Nazwa
            </label>
            <input id="nazwa" className="input" value={nazwa} maxLength={100} onChange={(e) => setNazwa(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="zakres">
              Zakres
            </label>
            <select id="zakres" className="input min-w-[14rem]" value={dzialId} onChange={(e) => setDzialId(e.target.value)}>
              <option value="">Cała firma (z drukarkami i magazynem)</option>
              {dzialy?.map((d) => (
                <option key={d.id} value={d.id}>
                  Sprzęt pracowników działu {d.nazwa}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={utworz.isPending || !nazwa.trim()}>
            {utworz.isPending ? 'Tworzenie…' : 'Rozpocznij'}
          </button>
        </div>
        {blad && <p className="field-error">{blad}</p>}
      </form>

      <DataTable
        columns={kolumny}
        items={lista}
        isLoading={isLoading}
        getRowKey={(i) => i.id}
        onRowClick={(i) => navigate(`/inwentaryzacje/${i.id}`)}
        emptyLabel="Nie przeprowadzono jeszcze żadnej inwentaryzacji."
      />
    </div>
  );
}

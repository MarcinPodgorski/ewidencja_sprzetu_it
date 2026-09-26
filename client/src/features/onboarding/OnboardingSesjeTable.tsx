import { useNavigate } from 'react-router-dom';
import { ONBOARDING_TRYB_LABELS } from 'shared';
import { DataTable, type Column } from '../../components/DataTable';
import type { OnboardingSesja } from '../../types/entities';
import { formatujDate } from './utils';

export function StatusSesji({ sesja }: { sesja: OnboardingSesja }) {
  if (sesja.pobranoAt) {
    return (
      <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
        pobrany {formatujDate(sesja.pobranoAt)}
      </span>
    );
  }
  if (sesja.wygasla) {
    return <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">wygasł</span>;
  }
  return <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">czeka na uruchomienie</span>;
}

interface OnboardingSesjeTableProps {
  sesje: OnboardingSesja[] | undefined;
  isLoading?: boolean;
  /** Kolumna z komputerem — zbędna na karcie konkretnego komputera. */
  pokazKomputer?: boolean;
}

/** Lista wygenerowanych skryptów — na karcie komputera i na stronie Onboarding. */
export function OnboardingSesjeTable({ sesje, isLoading, pokazKomputer = false }: OnboardingSesjeTableProps) {
  const navigate = useNavigate();

  const columns: Column<OnboardingSesja>[] = [
    { key: 'createdAt', header: 'Wygenerowano', render: (s) => formatujDate(s.createdAt) },
    ...(pokazKomputer
      ? [{ key: 'komputer', header: 'Komputer', render: (s: OnboardingSesja) => s.computer.numerEwidencyjny }]
      : []),
    { key: 'pracownik', header: 'Pracownik', render: (s) => `${s.employee.imie} ${s.employee.nazwisko}` },
    { key: 'tryb', header: 'Tryb', render: (s) => ONBOARDING_TRYB_LABELS[s.tryb] },
    { key: 'status', header: 'Status', render: (s) => <StatusSesji sesja={s} /> },
    { key: 'utworzyl', header: 'Wygenerował', render: (s) => s.utworzylAppUser?.login ?? '—' },
  ];

  return (
    <DataTable
      columns={columns}
      items={sesje}
      isLoading={isLoading}
      getRowKey={(s) => s.id}
      onRowClick={(s) => navigate(`/onboarding/sesje/${s.id}`)}
      emptyLabel="Nie wygenerowano jeszcze żadnego skryptu"
    />
  );
}

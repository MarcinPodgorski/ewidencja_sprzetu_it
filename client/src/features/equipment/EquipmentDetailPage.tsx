import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TYPY_Z_ETYKIETA } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { HistoryTable } from '../../components/HistoryTable';
import { AssignmentPanel } from '../../components/AssignmentPanel';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MaskedField } from '../../components/MaskedField';
import { EquipmentFakturyList } from '../faktury/EquipmentFakturyList';
import type { EquipmentFormFieldConfig, EquipmentTypeConfig } from './types';

function formatValue(value: unknown, field: EquipmentFormFieldConfig): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.displayFormat === 'money' && typeof value === 'number') {
    return `${(value / 100).toFixed(2)} zł`;
  }
  if (field.type === 'checkbox') return value ? 'Tak' : 'Nie';
  if (field.type === 'select' && field.options) {
    return field.options.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('pl-PL');
  }
  return String(value);
}

export function EquipmentDetailPage<
  T extends {
    id: number;
    wycofany: boolean;
    aktualnyUzytkownik?: { id: number; imie: string; nazwisko: string } | null;
  },
>({ config }: { config: EquipmentTypeConfig<T> }) {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const { data: item, isLoading, isError } = config.apiHooks.useDetail(numId);
  const { data: history } = config.apiHooks.useHistory(numId);
  const assignMutation = config.apiHooks.useAssign();
  const unassignMutation = config.apiHooks.useUnassign();
  const archiveMutation = config.apiHooks.useArchive();
  const restoreMutation = config.apiHooks.useRestore();

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (isError || !item) {
    return (
      <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
        Nie znaleziono tej pozycji. Mogła zostać usunięta albo link jest nieprawidłowy.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={config.identifier(item)}
        subtitle={config.singular}
        backTo={config.routeBase}
        actions={
          <>
            {(TYPY_Z_ETYKIETA as readonly string[]).includes(config.sprzetTyp) && (
              <Link
                to={`/etykiety?typ=${config.sprzetTyp}&szukaj=${encodeURIComponent(config.identifier(item))}`}
                className="btn-secondary"
              >
                Etykieta QR
              </Link>
            )}
            <Link to={`${config.routeBase}/${item.id}/edit`} className="btn-secondary">
              Edytuj
            </Link>
            {item.wycofany ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(item.id)}
              >
                {restoreMutation.isPending ? 'Przywracanie…' : 'Przywróć'}
              </button>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirmArchive(true)}>
                Wycofaj
              </button>
            )}
          </>
        }
      />

      <div className="mb-6">
        <StatusBadge wycofany={item.wycofany} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Dane sprzętu</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            {config.formFields.map((f) => (
              <div key={f.name}>
                <dt className="text-gray-500 dark:text-gray-400">{f.label}</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {f.sensitive ? (
                    <MaskedField value={(item as Record<string, unknown>)[f.name] as string | null} />
                  ) : f.renderDetail ? (
                    f.renderDetail((item as Record<string, unknown>)[f.name])
                  ) : (
                    formatValue((item as Record<string, unknown>)[f.name], f)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <AssignmentPanel
          currentUser={item.aktualnyUzytkownik}
          busy={assignMutation.isPending || unassignMutation.isPending}
          onAssign={(employeeId, notatka) => assignMutation.mutateAsync({ id: item.id, employeeId, notatka })}
          onUnassign={(notatka) => unassignMutation.mutateAsync({ id: item.id, notatka })}
        />
      </div>

      {config.DetailExtra && <config.DetailExtra item={item} />}

      <EquipmentFakturyList sprzetTyp={config.sprzetTyp} sprzetId={item.id} />

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Historia przypisań</h2>
        <HistoryTable history={history} />
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Wycofać ten sprzęt z ewidencji?"
        description="Sprzęt zostanie oznaczony jako wycofany. Historia przypisań pozostanie zachowana."
        confirmLabel="Wycofaj"
        danger
        busy={archiveMutation.isPending}
        onConfirm={() =>
          archiveMutation.mutate(item.id, {
            onSuccess: () => {
              setConfirmArchive(false);
              navigate(config.routeBase);
            },
          })
        }
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

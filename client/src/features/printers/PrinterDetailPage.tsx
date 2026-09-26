import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { HistoryTable } from '../../components/HistoryTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EquipmentFakturyList } from '../faktury/EquipmentFakturyList';
import { printersApi, tonersApi } from '../entities';
import { useAddPrinterToner, useRelocatePrinter, useRemovePrinterToner } from './printers.hooks';

function formatMoney(grosze: number): string {
  return `${(grosze / 100).toFixed(2)} zł`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL');
}

export function PrinterDetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [selectedToner, setSelectedToner] = useState('');

  const { data: printer, isLoading, isError } = printersApi.useDetail(numId);
  const { data: history } = printersApi.useHistory(numId);
  const { data: allToners } = tonersApi.useList();
  const relocateMutation = useRelocatePrinter();
  const addTonerMutation = useAddPrinterToner();
  const removeTonerMutation = useRemovePrinterToner();
  const archiveMutation = printersApi.useArchive();
  const restoreMutation = printersApi.useRestore();

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (isError || !printer) {
    return (
      <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
        Nie znaleziono tej drukarki. Mogła zostać usunięta albo link jest nieprawidłowy.
      </div>
    );
  }

  const usedTonerIds = new Set((printer.tonery ?? []).map((t) => t.toner.id));
  const availableToners = (allToners ?? []).filter((t) => !usedTonerIds.has(t.id));

  return (
    <div>
      <PageHeader
        title={printer.numerEwidencyjny}
        subtitle="Drukarka"
        backTo="/printers"
        actions={
          <>
            <Link to={`/printers/${printer.id}/edit`} className="btn-secondary">
              Edytuj
            </Link>
            {printer.wycofany ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(printer.id)}
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
        <StatusBadge wycofany={printer.wycofany} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Dane drukarki</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Numer seryjny</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{printer.numerSeryjny}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Marka/model</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{printer.markaModel}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Lokalizacja</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{printer.dzialPietroMiejsce}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Adres IP</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{printer.adresIP ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">MAC</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{printer.mac ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Data zakupu</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {printer.dataZakupu ? formatDate(printer.dataZakupu) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Data końca gwarancji</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {printer.dataKoncaGwarancji ? formatDate(printer.dataKoncaGwarancji) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Koszt brutto</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {printer.kosztBruttoGrosze !== null ? formatMoney(printer.kosztBruttoGrosze) : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Zmiana lokalizacji</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nowa lokalizacja"
              className="input"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!newLocation.trim() || relocateMutation.isPending}
              onClick={() => {
                relocateMutation.mutate({ id: printer.id, lokalizacja: newLocation.trim() });
                setNewLocation('');
              }}
            >
              Przenieś
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-6 max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Tonery/tusze</h2>
        {printer.tonery && printer.tonery.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {printer.tonery.map(({ toner }) => (
              <li key={toner.id} className="flex items-center justify-between text-sm">
                <span>
                  {toner.oznaczenie} <span className="text-gray-400 dark:text-gray-500">(stan magazynowy: {toner.ilosc})</span>
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                  disabled={removeTonerMutation.isPending}
                  onClick={() => removeTonerMutation.mutate({ printerId: printer.id, tonerId: toner.id })}
                >
                  usuń
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Brak przypisanych tonerów/tuszy.</p>
        )}
        <div className="flex items-center gap-2">
          <select className="input" value={selectedToner} onChange={(e) => setSelectedToner(e.target.value)}>
            <option value="">Dodaj toner/tusz…</option>
            {availableToners.map((t) => (
              <option key={t.id} value={t.id}>
                {t.oznaczenie}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={!selectedToner || addTonerMutation.isPending}
            onClick={() => {
              addTonerMutation.mutate({ printerId: printer.id, tonerId: Number(selectedToner) });
              setSelectedToner('');
            }}
          >
            Dodaj
          </button>
        </div>
      </div>

      <EquipmentFakturyList sprzetTyp="DRUKARKA" sprzetId={printer.id} />

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Historia lokalizacji</h2>
        <HistoryTable history={history} />
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Wycofać tę drukarkę z ewidencji?"
        description="Drukarka zostanie oznaczona jako wycofana. Historia lokalizacji pozostanie zachowana."
        confirmLabel="Wycofaj"
        danger
        busy={archiveMutation.isPending}
        onConfirm={() =>
          archiveMutation.mutate(printer.id, {
            onSuccess: () => {
              setConfirmArchive(false);
              navigate('/printers');
            },
          })
        }
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

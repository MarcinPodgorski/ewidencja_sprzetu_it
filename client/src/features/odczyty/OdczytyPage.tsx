import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ZRODLO_ODCZYTU_LABELS } from 'shared';
import { DataTable, type Column } from '../../components/DataTable';
import { KomendaDoSkopiowania } from '../../components/KomendaDoSkopiowania';
import { PageHeader } from '../../components/PageHeader';
import { ApiError, apiUrl } from '../../lib/api';
import type { OdczytSprzetu } from '../../types/entities';
import { formatujDate } from '../onboarding/utils';
import { useImportOdczytu, useOdczytKody, useOdczyty, useUniewaznijKodOdczytu, useUtworzKodOdczytu } from './odczyty.hooks';
import { StatusOdczytuBadge, komendaOdczytu } from './utils';

const kolumny: Column<OdczytSprzetu>[] = [
  {
    key: 'otrzymano',
    header: 'Otrzymano',
    className: 'whitespace-nowrap',
    render: (o) => formatujDate(o.otrzymanoAt),
  },
  {
    key: 'komputer',
    header: 'Komputer',
    render: (o) => (
      <div>
        <div className="font-medium text-gray-900 dark:text-gray-100">{o.hostname ?? '—'}</div>
        {o.markaModel && <div className="text-xs text-gray-500 dark:text-gray-400">{o.markaModel}</div>}
      </div>
    ),
  },
  { key: 'seryjny', header: 'Nr seryjny', render: (o) => <span className="font-mono text-xs">{o.numerSeryjny ?? '—'}</span> },
  {
    key: 'ewidencja',
    header: 'W ewidencji',
    render: (o) =>
      o.computer ? (
        <Link
          to={`/computers/${o.computer.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {o.computer.numerEwidencyjny}
        </Link>
      ) : (
        <span className="badge bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">nowy komputer</span>
      ),
  },
  { key: 'zrodlo', header: 'Źródło', render: (o) => ZRODLO_ODCZYTU_LABELS[o.zrodlo] },
  { key: 'status', header: 'Status', render: (o) => <StatusOdczytuBadge odczyt={o} /> },
];

/** Aktywny ogólny kod: jednolinijkowiec do uruchamiania na kolejnych komputerach. */
function KartaSkryptu() {
  const { data: kody, isLoading } = useOdczytKody();
  const utworz = useUtworzKodOdczytu();
  const uniewaznij = useUniewaznijKodOdczytu();
  const kod = kody?.[0];

  return (
    <div className="card mb-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Skrypt odczytu</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Na komputerze otwórz PowerShell lub Terminal (wystarczą zwykłe uprawnienia) i wklej polecenie. Skrypt odczyta
            model, numer seryjny, procesor, pamięć, dyski, wersję Windowsa i adresy MAC — i niczego nie zmieni. Jednym
            kodem obejdziesz dowolnie wiele komputerów.
          </p>
        </div>
        {kod && (
          <button type="button" className="btn-secondary" disabled={uniewaznij.isPending} onClick={() => uniewaznij.mutate(kod.id)}>
            Unieważnij kod
          </button>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
      ) : kod ? (
        <>
          <KomendaDoSkopiowania komenda={komendaOdczytu(kod.kod)} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Kod <strong className="font-mono text-sm text-gray-800 dark:text-gray-200">{kod.kod}</strong> ważny do{' '}
            {formatujDate(kod.wygasaAt)} · odebrane odczyty: {kod.liczbaOdczytow} · komputer musi być w sieci serwera
            aplikacji (bez niej skrypt zapisze plik na pulpicie). Można też{' '}
            <a href={apiUrl(`/odczyty/kody/${kod.id}/skrypt`)} download className="font-medium text-indigo-600 dark:text-indigo-400">
              pobrać skrypt jako plik .ps1
            </a>
            .
          </p>
        </>
      ) : (
        <button type="button" className="btn-primary" disabled={utworz.isPending} onClick={() => utworz.mutate(undefined)}>
          {utworz.isPending ? 'Generowanie…' : 'Wygeneruj polecenie (ważne 7 dni)'}
        </button>
      )}
    </div>
  );
}

export function OdczytyPage() {
  const navigate = useNavigate();
  const [tylkoNowe, setTylkoNowe] = useState(true);
  const { data: odczyty, isLoading } = useOdczyty(tylkoNowe ? { status: 'NOWY' } : {});
  const { data: nowe } = useOdczyty({ status: 'NOWY' });
  const importuj = useImportOdczytu();
  const [bladImportu, setBladImportu] = useState<string | null>(null);
  const plikRef = useRef<HTMLInputElement>(null);

  async function wgrajPlik(e: ChangeEvent<HTMLInputElement>) {
    const plik = e.target.files?.[0];
    e.target.value = '';
    if (!plik) return;
    setBladImportu(null);
    try {
      // Plik mógł przejść przez edytor, który dopisał BOM — JSON.parse by się na nim wyłożył.
      const dane = JSON.parse((await plik.text()).replace(/^\uFEFF/, ''));
      const odczyt = await importuj.mutateAsync(dane);
      navigate(`/odczyty/${odczyt.id}`);
    } catch (err) {
      setBladImportu(
        err instanceof SyntaxError
          ? 'To nie jest plik odczytu (niepoprawny JSON).'
          : err instanceof ApiError
            ? `Nie udało się wgrać pliku: ${err.message}`
            : 'Nie udało się wgrać pliku.',
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Odczyt sprzętu"
        subtitle="Dane zebrane skryptem z komputerów — nic nie trafia do ewidencji bez Twojego zatwierdzenia"
        actions={
          <>
            <input ref={plikRef} type="file" accept=".json,application/json" className="hidden" onChange={wgrajPlik} />
            <button type="button" className="btn-secondary" disabled={importuj.isPending} onClick={() => plikRef.current?.click()}>
              {importuj.isPending ? 'Wgrywanie…' : 'Wgraj plik odczytu'}
            </button>
          </>
        }
      />
      {bladImportu && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{bladImportu}</div>
      )}

      <KartaSkryptu />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {[
          { wartosc: true, etykieta: `Do przejrzenia${nowe ? ` (${nowe.length})` : ''}` },
          { wartosc: false, etykieta: 'Wszystkie' },
        ].map((f) => (
          <button
            key={String(f.wartosc)}
            type="button"
            onClick={() => setTylkoNowe(f.wartosc)}
            className={
              tylkoNowe === f.wartosc
                ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white'
                : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
          >
            {f.etykieta}
          </button>
        ))}
      </div>

      <DataTable
        columns={kolumny}
        items={odczyty}
        isLoading={isLoading}
        getRowKey={(o) => o.id}
        onRowClick={(o) => navigate(`/odczyty/${o.id}`)}
        emptyLabel={tylkoNowe ? 'Nie ma odczytów do przejrzenia.' : 'Nie odebrano jeszcze żadnego odczytu.'}
      />
    </div>
  );
}

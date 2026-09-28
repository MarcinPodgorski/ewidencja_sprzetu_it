import { useState } from 'react';
import { Link } from 'react-router-dom';
import { rodzinaSystemu, ZRODLO_ODCZYTU_LABELS } from 'shared';
import { KomendaDoSkopiowania } from '../../components/KomendaDoSkopiowania';
import { apiUrl } from '../../lib/api';
import type { Computer } from '../../types/entities';
import { formatujDate } from '../onboarding/utils';
import { useOdczytKody, useOdczyty, useUtworzKodOdczytu } from './odczyty.hooks';
import { StatusOdczytuBadge, komendaOdczytu } from './utils';

/** Sekcja „Odczyt z komputera” na karcie komputera (część DetailExtra w computers.config). */
export function ComputerOdczytPanel({ item }: { item: Computer }) {
  const { data: odczyty } = useOdczyty({ computerId: item.id });
  const { data: kody } = useOdczytKody(item.id);
  const utworzKod = useUtworzKodOdczytu();
  const [pokazKomende, setPokazKomende] = useState(false);

  // Skrypt jest dla Windowsa — przy innych systemach sekcja zostaje tylko dla historii odczytów.
  const innySystem =
    item.systemOperacyjny !== null && !['WINDOWS', 'INNY'].includes(rodzinaSystemu(item.systemOperacyjny));
  if (innySystem && !odczyty?.length) return null;

  const kod = kody?.[0];
  const nowy = odczyty?.find((o) => o.status === 'NOWY');

  async function odczytaj() {
    if (!kod) await utworzKod.mutateAsync(item.id);
    setPokazKomende(true);
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Odczyt z komputera</h2>
        {!item.wycofany && !innySystem && !pokazKomende && (
          <button type="button" className="btn-secondary" disabled={utworzKod.isPending} onClick={odczytaj}>
            Odczytaj dane z tego komputera
          </button>
        )}
      </div>

      {nowy && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <span>
            Odczyt z {formatujDate(nowy.otrzymanoAt)} ({ZRODLO_ODCZYTU_LABELS[nowy.zrodlo]}) czeka na przejrzenie.
          </span>
          <Link to={`/odczyty/${nowy.id}`} className="font-medium underline">
            Przejrzyj zmiany
          </Link>
        </div>
      )}

      {pokazKomende && kod && (
        <div className="card mb-3">
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            Na komputerze <strong>{item.numerEwidencyjny}</strong> otwórz PowerShell lub Terminal i wklej polecenie — odczyt
            trafi prosto do tego komputera, do przejrzenia tutaj.
          </p>
          <KomendaDoSkopiowania komenda={komendaOdczytu(kod.kod)} />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Ważne do {formatujDate(kod.wygasaAt)} ·{' '}
            <a href={apiUrl(`/odczyty/kody/${kod.id}/skrypt`)} download className="font-medium text-indigo-600 dark:text-indigo-400">
              pobierz jako plik .ps1
            </a>
          </p>
        </div>
      )}

      {odczyty && odczyty.length > 0 ? (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Otrzymano</th>
                <th>Źródło</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {odczyty.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{formatujDate(o.otrzymanoAt)}</td>
                  <td>{ZRODLO_ODCZYTU_LABELS[o.zrodlo]}</td>
                  <td>
                    <StatusOdczytuBadge odczyt={o} />
                  </td>
                  <td className="text-right">
                    <Link to={`/odczyty/${o.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                      {o.status === 'NOWY' ? 'przejrzyj' : 'szczegóły'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !pokazKomende && (
          <div className="card text-sm text-gray-500 dark:text-gray-400">
            Skrypt odczyta z komputera model, numer seryjny, procesor, pamięć, dyski, wersję Windowsa i adresy MAC — a Ty
            zdecydujesz, co przepisać do ewidencji.
          </div>
        )
      )}
    </div>
  );
}

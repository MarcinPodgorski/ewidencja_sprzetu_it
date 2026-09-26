import { Link } from 'react-router-dom';
import type { EquipmentType } from 'shared';
import { apiUrl } from '../../lib/api';
import { useEquipmentFaktury } from './faktury.hooks';

function formatMoney(grosze: number): string {
  return `${(grosze / 100).toFixed(2)} zł`;
}

/** Sekcja "Faktury" na stronie szczegółów sprzętu — odnośnik do powiązanej faktury
 *  (może być ich więcej niż jedna) + skróty pobrania załączników PDF/XML, bez wchodzenia
 *  do modułu Faktury. Renderowana dla wszystkich typów sprzętu, także drukarek. */
export function EquipmentFakturyList({ sprzetTyp, sprzetId }: { sprzetTyp: EquipmentType; sprzetId: number }) {
  const { data: faktury } = useEquipmentFaktury(sprzetTyp, sprzetId);

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Faktury</h2>
      {!faktury ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
      ) : faktury.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Brak powiązanych faktur.</div>
      ) : (
        <div className="card divide-y divide-gray-100 p-0 dark:divide-gray-700">
          {faktury.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link
                  to={`/faktury/${f.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {f.numer}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatMoney(f.kwotaGrosze)}
                  {f.numerKsef ? ` · KSeF: ${f.numerKsef}` : ''}
                </p>
              </div>
              <div className="flex gap-3">
                {f.plikPdf && (
                  <a
                    href={apiUrl(`/faktury/${f.id}/plik/pdf`)}
                    download
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Pobierz PDF
                  </a>
                )}
                {f.plikXml && (
                  <a
                    href={apiUrl(`/faktury/${f.id}/plik/xml`)}
                    download
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Pobierz XML
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

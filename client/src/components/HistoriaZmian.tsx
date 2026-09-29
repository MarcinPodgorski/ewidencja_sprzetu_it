import { useQuery } from '@tanstack/react-query';
import type { EncjaHistorii, OperacjaZmiany } from 'shared';
import { api } from '../lib/api';

export type WartoscZmiany = string | number | boolean | null;

interface WpisHistorii {
  id: number;
  operacja: OperacjaZmiany;
  zmiany: { pole: string; przed: WartoscZmiany; po: WartoscZmiany }[];
  kontekst: string | null;
  createdAt: string;
  appUser: { id: number; login: string } | null;
}

export interface PoleHistorii {
  etykieta: string;
  format?: (wartosc: WartoscZmiany) => string;
}

const OPERACJE: Record<OperacjaZmiany, string> = {
  UTWORZENIE: 'Dodano do ewidencji',
  EDYCJA: 'Zmiana danych',
  WYCOFANIE: 'Wycofano z ewidencji',
  PRZYWROCENIE: 'Przywrócono do ewidencji',
};

function formatDomyslny(wartosc: WartoscZmiany): string {
  if (wartosc === null) return '—';
  if (typeof wartosc === 'boolean') return wartosc ? 'tak' : 'nie';
  if (typeof wartosc === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(wartosc)) return new Date(wartosc).toLocaleDateString('pl-PL');
  return String(wartosc);
}

/**
 * Dziennik zmian danych rekordu (kto, kiedy, co zmienił). `kluczOdswiezania` = klucz
 * zapytań encji (np. 'computers') — każda mutacja tej encji odświeża też historię.
 */
export function HistoriaZmian({
  encja,
  encjaId,
  pola,
  kluczOdswiezania,
}: {
  encja: EncjaHistorii;
  encjaId: number;
  pola: Record<string, PoleHistorii>;
  kluczOdswiezania: string;
}) {
  const { data: wpisy } = useQuery({
    queryKey: [kluczOdswiezania, 'historia-zmian', encja, encjaId],
    queryFn: () =>
      api.get<{ items: WpisHistorii[] }>('/historia-zmian', { encja, encjaId }).then((r) => r.items),
  });

  const opis = (pole: string, wartosc: WartoscZmiany) => (pola[pole]?.format ?? formatDomyslny)(wartosc);
  const etykieta = (pole: string) => pola[pole]?.etykieta ?? pole;

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Historia zmian</h2>
      {!wpisy ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
      ) : wpisy.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Dane nie były zmieniane od włączenia dziennika zmian.</p>
      ) : (
        <div className="card p-0">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {wpisy.map((w) => (
              <li key={w.id} className="px-5 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{OPERACJE[w.operacja]}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(w.createdAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                    {w.appUser?.login ?? 'system'}
                    {w.kontekst && ` · ${w.kontekst}`}
                  </span>
                </div>
                {w.operacja === 'UTWORZENIE' && w.zmiany.length > 0 ? (
                  <details className="mt-1 text-sm">
                    <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">dane przy dodaniu</summary>
                    <ul className="mt-1 space-y-0.5">
                      {w.zmiany.map((z) => (
                        <li key={z.pole}>
                          <span className="text-gray-500 dark:text-gray-400">{etykieta(z.pole)}:</span> {opis(z.pole, z.po)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  w.zmiany.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {w.zmiany.map((z) => (
                        <li key={z.pole} className="text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">{etykieta(z.pole)}:</span>{' '}
                          <span className="text-gray-400 line-through dark:text-gray-500">{opis(z.pole, z.przed)}</span> →{' '}
                          <span className="font-medium">{opis(z.pole, z.po)}</span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import type { StatusInwentaryzacji } from 'shared';

export function StatusInwentaryzacjiBadge({ status }: { status: StatusInwentaryzacji }) {
  return status === 'OTWARTA' ? (
    <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />w toku
    </span>
  ) : (
    <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">zamknięta</span>
  );
}

export function PasekPostepu({ potwierdzone, wszystkie, spozaListy = 0 }: { potwierdzone: number; wszystkie: number; spozaListy?: number }) {
  const procent = wszystkie > 0 ? Math.round((100 * potwierdzone) / wszystkie) : 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          <strong className="text-gray-900 dark:text-gray-100">{potwierdzone}</strong> z {wszystkie}
          {spozaListy > 0 && <span className="text-sky-600 dark:text-sky-400"> +{spozaListy} spoza listy</span>}
        </span>
        <span>{procent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${procent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${procent}%` }}
        />
      </div>
    </div>
  );
}

/** Numer ewidencyjny z tekstu wpisanego ręcznie albo z czytnika kodów, który „wpisuje” cały
 *  adres z naklejki (…/sprzet/q/KOMP-001) — wtedy bierzemy tylko końcówkę po /q/. */
export function numerZKodu(tekst: string): string {
  const wpis = tekst.trim();
  const dopasowanie = wpis.match(/\/q\/([^/?#\s]+)/);
  if (!dopasowanie) return wpis;
  try {
    return decodeURIComponent(dopasowanie[1]);
  } catch {
    return dopasowanie[1];
  }
}

import type { HistoryEntry } from '../lib/entityHooks';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pl-PL');
}

export function HistoryTable({ history }: { history: HistoryEntry[] | undefined }) {
  if (!history) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie historii…</p>;
  }
  if (history.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Brak historii przypisań.</p>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="table-base">
        <thead>
          <tr>
            <th>Użytkownik / lokalizacja</th>
            <th>Od</th>
            <th>Do</th>
            <th>Notatka</th>
            <th>Zarejestrował</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>
                {h.uzytkownik ? `${h.uzytkownik.imie} ${h.uzytkownik.nazwisko}` : (h.lokalizacja ?? '—')}
              </td>
              <td>{formatDateTime(h.dataOd)}</td>
              <td>
                {h.dataDo ? (
                  formatDateTime(h.dataDo)
                ) : (
                  <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">obecnie</span>
                )}
              </td>
              <td>{h.notatka ?? '—'}</td>
              <td>{h.utworzylAppUser ? h.utworzylAppUser.login : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

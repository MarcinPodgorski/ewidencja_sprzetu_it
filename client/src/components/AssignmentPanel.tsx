import { useState } from 'react';
import { employeesApi } from '../features/entities';

interface AssignmentPanelProps {
  currentUser: { id: number; imie: string; nazwisko: string } | null | undefined;
  onAssign: (employeeId: number, notatka?: string) => Promise<unknown>;
  onUnassign: (notatka?: string) => Promise<unknown>;
  busy?: boolean;
}

/** Panel przypisania sprzętu do pracownika — używany na stronach szczegółów
 *  wszystkich typów sprzętu, które mają koncepcję "użytkownika" (wszystkie oprócz drukarki). */
export function AssignmentPanel({ currentUser, onAssign, onUnassign, busy }: AssignmentPanelProps) {
  const { data: employees } = employeesApi.useList();
  const [employeeId, setEmployeeId] = useState('');
  const [notatka, setNotatka] = useState('');

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Przypisanie</h2>
      {currentUser ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Aktualny użytkownik:{' '}
            <span className="font-medium">
              {currentUser.imie} {currentUser.nazwisko}
            </span>
          </p>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => onUnassign()}>
            Zdejmij przypisanie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sprzęt nie jest aktualnie przypisany.</p>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Wybierz pracownika…</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.imie} {emp.nazwisko} {emp.dzial ? `(${emp.dzial.nazwa})` : ''}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Notatka (opcjonalnie)"
            className="input"
            value={notatka}
            onChange={(e) => setNotatka(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!employeeId || busy}
            onClick={() => {
              void onAssign(Number(employeeId), notatka || undefined);
              setEmployeeId('');
              setNotatka('');
            }}
          >
            Przypisz
          </button>
        </div>
      )}
    </div>
  );
}

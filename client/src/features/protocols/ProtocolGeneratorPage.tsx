import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { downloadFile, ApiError } from '../../lib/api';
import { employeesApi } from '../entities';
import { useEmployeeEquipment } from '../employees/employees.hooks';
import { useMiscItems } from '../employees/miscItems.hooks';

/** Klucze pozycji "Różne" w zbiorze zaznaczeń mają ten prefiks — sprzętowe typy
 *  (KOMPUTER, KARTA_SIM…) go nie używają, więc nie ma ryzyka kolizji. */
const MISC_KEY_PREFIX = 'MISC-';

export function ProtocolGeneratorPage() {
  const [searchParams] = useSearchParams();
  const initialEmployeeId = searchParams.get('employeeId');

  const { data: employees } = employeesApi.useList();
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numEmployeeId = employeeId ? Number(employeeId) : undefined;
  const { data: equipment } = useEmployeeEquipment(numEmployeeId);
  const { data: miscItems } = useMiscItems(numEmployeeId);

  // Domyślnie zaznacz cały bieżący sprzęt i dodatki pracownika po jego wybraniu/zmianie.
  useEffect(() => {
    if (equipment && miscItems) {
      setSelected(
        new Set([
          ...equipment.map((e) => `${e.sprzetTyp}-${e.id}`),
          ...miscItems.map((m) => `${MISC_KEY_PREFIX}${m.id}`),
        ]),
      );
    }
  }, [equipment, miscItems]);

  const selectedEmployee = useMemo(
    () => employees?.find((e) => e.id === numEmployeeId),
    [employees, numEmployeeId],
  );

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onGenerate() {
    if (!numEmployeeId || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const items: { sprzetTyp: string; sprzetId: number }[] = [];
      const miscItemIds: number[] = [];
      for (const key of selected) {
        if (key.startsWith(MISC_KEY_PREFIX)) {
          miscItemIds.push(Number(key.slice(MISC_KEY_PREFIX.length)));
          continue;
        }
        const [sprzetTyp, sprzetId] = key.split('-');
        items.push({ sprzetTyp, sprzetId: Number(sprzetId) });
      }
      const filenameSafe = `${selectedEmployee?.nazwisko ?? 'pracownik'}-${selectedEmployee?.imie ?? ''}`.replace(
        /\s+/g,
        '-',
      );
      await downloadFile(
        '/protocols/generate',
        { employeeId: numEmployeeId, items, miscItemIds },
        `protokol-${filenameSafe}.pdf`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nie udało się wygenerować protokołu');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Protokół przekazania sprzętu" backTo="/employees" />

      <div className="card space-y-4">
        <div>
          <label className="label">Pracownik</label>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Wybierz pracownika…</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.imie} {emp.nazwisko} {emp.dzial ? `(${emp.dzial.nazwa})` : ''}
              </option>
            ))}
          </select>
        </div>

        {numEmployeeId && (
          <div>
            <label className="label">Sprzęt do ujęcia w protokole</label>
            {!equipment || !miscItems ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
            ) : equipment.length === 0 && miscItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ten pracownik nie ma aktualnie żadnego przypisanego sprzętu ani dodatków.
              </p>
            ) : (
              <div className="space-y-1 rounded-md border border-gray-200 p-3 dark:border-gray-700">
                {equipment.map((item) => {
                  const typ = item.sprzetTyp as EquipmentType;
                  const key = `${typ}-${item.id}`;
                  const label = typ === 'KARTA_SIM' ? item.iccid : item.numerEwidencyjny;
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                      />
                      <span className="text-gray-400 dark:text-gray-500">{EQUIPMENT_TYPE_LABELS[typ]}</span>
                      <span>
                        {label} {item.markaModel ? `— ${item.markaModel}` : ''}
                      </span>
                    </label>
                  );
                })}
                {miscItems.map((item) => {
                  const key = `${MISC_KEY_PREFIX}${item.id}`;
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                      />
                      <span className="text-gray-400 dark:text-gray-500">Różne</span>
                      <span>{item.opis}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <button
          type="button"
          className="btn-primary"
          disabled={!numEmployeeId || selected.size === 0 || busy}
          onClick={onGenerate}
        >
          {busy ? 'Generowanie…' : 'Generuj i pobierz PDF'}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPES, type EquipmentType } from 'shared';
import { useEquipmentSearch } from '../equipment/equipmentSearch.hooks';
import { computersApi, keyboardsApi, miceApi, monitorsApi, phonesApi, simCardsApi } from '../entities';

/** Typy sprzętu, które mają koncepcję "użytkownika" i można je przypisać do
 *  pracownika z jego karty — drukarka ma lokalizację zamiast osoby (relocate). */
type AssignableType = Exclude<EquipmentType, 'DRUKARKA'>;
const ASSIGNABLE_TYPES = EQUIPMENT_TYPES.filter((t): t is AssignableType => t !== 'DRUKARKA');

interface AssignMutation {
  mutateAsync: (vars: { id: number; employeeId: number }) => Promise<unknown>;
  isPending: boolean;
}

interface AssignEquipmentModalProps {
  employeeId: number;
  onClose: () => void;
}

/** Modal przypisywania istniejącego sprzętu do pracownika z jego karty — odwrotność
 *  `AssignmentPanel` (tam sprzęt wybiera pracownika, tutaj pracownik wybiera sprzęt),
 *  z podziałem na kategorie i skrótem do dodania sprzętu, którego jeszcze nie ma w bazie. */
export function AssignEquipmentModal({ employeeId, onClose }: AssignEquipmentModalProps) {
  const [category, setCategory] = useState<AssignableType>('KOMPUTER');
  const [query, setQuery] = useState('');
  const qc = useQueryClient();

  const { data: results, isFetching } = useEquipmentSearch(query, category);

  // Każdy typ sprzętu ma własny endpoint /:id/assign — hooki trzeba wywołać
  // bezwarunkowo (zasady hooków), a właściwy wybrać dopiero po kategorii.
  const assignByType: Record<AssignableType, AssignMutation> = {
    KOMPUTER: computersApi.useAssign(),
    MONITOR: monitorsApi.useAssign(),
    MYSZ: miceApi.useAssign(),
    KLAWIATURA: keyboardsApi.useAssign(),
    TELEFON: phonesApi.useAssign(),
    KARTA_SIM: simCardsApi.useAssign(),
  };
  const busy = Object.values(assignByType).some((m) => m.isPending);

  async function handleAssign(sprzetTyp: AssignableType, sprzetId: number) {
    await assignByType[sprzetTyp].mutateAsync({ id: sprzetId, employeeId });
    // useAssign inwaliduje tylko cache własnego typu sprzętu — zagregowany widok
    // pracownika (equipment + historia) i wyniki wyszukiwarki w tym modalu (żeby
    // pozycja od razu pokazała się jako "już przypisany") trzeba odświeżyć osobno.
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['employees', 'equipment', employeeId] }),
      qc.invalidateQueries({ queryKey: ['employees', 'history', employeeId] }),
      qc.invalidateQueries({ queryKey: ['equipment-search'] }),
    ]);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Przypisz sprzęt</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {ASSIGNABLE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCategory(t)}
              className={
                category === t
                  ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white'
                  : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }
            >
              {EQUIPMENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Szukaj po numerze ewidencyjnym, seryjnym, marce…"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {isFetching && <p className="text-sm text-gray-400 dark:text-gray-500">Szukanie…</p>}
          {!isFetching && results?.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Brak wyników w kategorii „{EQUIPMENT_TYPE_LABELS[category]}”.
            </p>
          )}
          {results?.map((r) => {
            const isThisEmployee = r.aktualnyUzytkownik?.id === employeeId;
            return (
              <div
                key={`${r.sprzetTyp}-${r.sprzetId}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="min-w-0 truncate">
                  {r.identyfikator} {r.opis ? `— ${r.opis}` : ''}
                  {r.aktualnyUzytkownik && !isThisEmployee && (
                    <span className="ml-2 whitespace-nowrap text-xs text-amber-600 dark:text-amber-400">
                      obecnie: {r.aktualnyUzytkownik.imie} {r.aktualnyUzytkownik.nazwisko}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-300 dark:text-indigo-400 dark:hover:text-indigo-300 dark:disabled:text-gray-600"
                  disabled={isThisEmployee || busy}
                  onClick={() => void handleAssign(category, r.sprzetId)}
                >
                  {isThisEmployee ? 'już przypisany' : 'przypisz'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Nie ma jeszcze w bazie? Dodaj nowy:{' '}
          {ASSIGNABLE_TYPES.map((t, i) => (
            <span key={t}>
              <Link
                to={`/${EQUIPMENT_API_SEGMENT[t]}/new`}
                className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {EQUIPMENT_TYPE_LABELS[t]}
              </Link>
              {i < ASSIGNABLE_TYPES.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}

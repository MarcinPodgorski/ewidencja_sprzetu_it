import { useState } from 'react';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPES, type EquipmentType } from 'shared';
import { useEquipmentSearch } from '../equipment/equipmentSearch.hooks';

export interface PickedEquipment {
  sprzetTyp: EquipmentType;
  sprzetId: number;
  identyfikator: string;
  opis: string | null;
}

interface EquipmentMultiPickerProps {
  selected: PickedEquipment[];
  onAdd: (item: PickedEquipment) => void;
  onRemove: (sprzetTyp: EquipmentType, sprzetId: number) => void;
}

/** Wybór wielu sztuk sprzętu naraz (dowolnej kategorii, w tym drukarek — faktura nie
 *  jest ograniczona do sprzętu z pojęciem "użytkownika") — używany w formularzu faktury,
 *  bo jedna faktura może obejmować wiele pozycji. Odwrotność `AssignEquipmentModal`
 *  (tam wybór jest pojedynczy i od razu przypisuje), tutaj tylko buduje listę. */
export function EquipmentMultiPicker({ selected, onAdd, onRemove }: EquipmentMultiPickerProps) {
  const [category, setCategory] = useState<EquipmentType>('KOMPUTER');
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useEquipmentSearch(query, category);

  const selectedKeys = new Set(selected.map((s) => `${s.sprzetTyp}-${s.sprzetId}`));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {EQUIPMENT_TYPES.map((t) => (
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

      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-700">
        {isFetching && <p className="text-sm text-gray-400 dark:text-gray-500">Szukanie…</p>}
        {!isFetching && results?.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Brak wyników w kategorii „{EQUIPMENT_TYPE_LABELS[category]}”.
          </p>
        )}
        {results?.map((r) => {
          const key = `${r.sprzetTyp}-${r.sprzetId}`;
          const already = selectedKeys.has(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="min-w-0 truncate">
                {r.identyfikator} {r.opis ? `— ${r.opis}` : ''}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-300 dark:text-indigo-400 dark:hover:text-indigo-300 dark:disabled:text-gray-600"
                disabled={already}
                onClick={() =>
                  onAdd({ sprzetTyp: category, sprzetId: r.sprzetId, identyfikator: r.identyfikator, opis: r.opis })
                }
              >
                {already ? 'dodano' : 'dodaj'}
              </button>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Wybrany sprzęt ({selected.length})
          </p>
          <ul className="space-y-1">
            {selected.map((s) => (
              <li
                key={`${s.sprzetTyp}-${s.sprzetId}`}
                className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-2 py-1.5 text-sm dark:bg-gray-700"
              >
                <span className="min-w-0 truncate">
                  <span className="text-gray-400 dark:text-gray-500">{EQUIPMENT_TYPE_LABELS[s.sprzetTyp]}</span>{' '}
                  {s.identyfikator} {s.opis ? `— ${s.opis}` : ''}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => onRemove(s.sprzetTyp, s.sprzetId)}
                >
                  usuń
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

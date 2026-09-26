import { useState } from 'react';
import { EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { useEquipmentSearch } from '../equipment/equipmentSearch.hooks';

interface AddListItemWidgetProps {
  existingKeys: Set<string>;
  busy?: boolean;
  onAdd: (sprzetTyp: string, sprzetId: number) => void;
}

/** Wyszukiwarka sprzętu do ręcznego dodawania pozycji do spisu (rola "user" z EDIT
 *  korzysta z /equipment/search, które nie ujawnia danych wrażliwych). */
export function AddListItemWidget({ existingKeys, busy, onAdd }: AddListItemWidgetProps) {
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useEquipmentSearch(query);

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Dodaj pozycję</h2>
      <input
        type="text"
        placeholder="Szukaj po numerze ewidencyjnym, seryjnym, marce…"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {isFetching && <p className="text-sm text-gray-400 dark:text-gray-500">Szukanie…</p>}
        {!isFetching && results?.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">Brak wyników.</p>
        )}
        {results?.map((r) => {
          const key = `${r.sprzetTyp}-${r.sprzetId}`;
          const already = existingKeys.has(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>
                <span className="text-gray-400 dark:text-gray-500">{EQUIPMENT_TYPE_LABELS[r.sprzetTyp as EquipmentType]}</span>{' '}
                {r.identyfikator} {r.opis ? `— ${r.opis}` : ''}
              </span>
              <button
                type="button"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-300 dark:text-indigo-400 dark:hover:text-indigo-300 dark:disabled:text-gray-600"
                disabled={already || busy}
                onClick={() => onAdd(r.sprzetTyp, r.sprzetId)}
              >
                {already ? 'już w spisie' : 'dodaj'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

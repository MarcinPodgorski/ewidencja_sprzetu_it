import { useState } from 'react';
import { useCreateMiscItem, useDeleteMiscItem, useMiscItems } from './miscItems.hooks';

/** Sekcja "Dodatki" na karcie pracownika — kategoria "Różne" celowo bez własnej
 *  strony/sekcji w nawigacji: tylko lista opisów + dodawanie/usuwanie w miejscu. */
export function MiscItemsSection({ employeeId }: { employeeId: number }) {
  const { data: items } = useMiscItems(employeeId);
  const createMutation = useCreateMiscItem(employeeId);
  const deleteMutation = useDeleteMiscItem(employeeId);
  const [opis, setOpis] = useState('');

  function handleAdd() {
    const trimmed = opis.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed, { onSuccess: () => setOpis('') });
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Dodatki</h2>
      <div className="card">
        {items && items.length > 0 ? (
          <ul className="mb-3 space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-800 dark:text-gray-200">{item.opis}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-red-600 hover:text-red-500 disabled:text-gray-300 dark:text-red-400 dark:hover:text-red-300 dark:disabled:text-gray-600"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  usuń
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Brak dodatków.</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="np. Podstawka pod monitor"
            className="input"
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={!opis.trim() || createMutation.isPending}
            onClick={handleAdd}
          >
            + Dodaj
          </button>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  items: T[] | undefined;
  isLoading?: boolean;
  getRowKey: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyLabel?: string;
}

export function DataTable<T>({ columns, items, isLoading, getRowKey, onRowClick, emptyLabel }: DataTableProps<T>) {
  if (isLoading) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (!items || items.length === 0) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">{emptyLabel ?? 'Brak pozycji do wyświetlenia'}</div>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={getRowKey(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              // `group` pozwala komórkom reagować na najechanie na cały wiersz (np. ikonka systemu).
              className={onRowClick ? 'group cursor-pointer' : 'group'}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

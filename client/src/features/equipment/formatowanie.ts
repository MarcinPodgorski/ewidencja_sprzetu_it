import type { EquipmentFormFieldConfig } from './types';

/** Wartość pola sprzętu do wyświetlenia (etykiety list wyboru, daty, kwoty, tak/nie). */
export function formatujWartoscPola(value: unknown, field: EquipmentFormFieldConfig): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.displayFormat === 'money' && typeof value === 'number') {
    return `${(value / 100).toFixed(2)} zł`;
  }
  if (field.type === 'checkbox') return value ? 'Tak' : 'Nie';
  if (field.type === 'select' && field.options) {
    return field.options.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('pl-PL');
  }
  return String(value);
}

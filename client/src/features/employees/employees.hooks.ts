import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { HistoryEntry } from '../../lib/entityHooks';
import type { EmployeeEquipmentItem } from '../../types/entities';

export interface EmployeeHistoryEntry extends HistoryEntry {
  sprzet: { sprzetTyp: string; identyfikator: string; opis: string | null } | null;
}

export function useEmployeeEquipment(employeeId: number | undefined) {
  return useQuery({
    queryKey: ['employees', 'equipment', employeeId],
    queryFn: () =>
      api.get<{ items: EmployeeEquipmentItem[] }>(`/employees/${employeeId}/equipment`).then((r) => r.items),
    enabled: employeeId !== undefined,
  });
}

export function useEmployeeHistory(employeeId: number | undefined) {
  return useQuery({
    queryKey: ['employees', 'history', employeeId],
    queryFn: () =>
      api.get<{ history: EmployeeHistoryEntry[] }>(`/employees/${employeeId}/history`).then((r) => r.history),
    enabled: employeeId !== undefined,
  });
}

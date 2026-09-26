import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** "Różne" (MiscItem) — patrz komentarz przy modelu w schema.prisma: drobne dodatki
 *  przypisane do pracownika bez własnej ewidencji, tylko opis + właściciel. */
export interface MiscItem {
  id: number;
  opis: string;
  employeeId: number;
  createdAt: string;
}

function queryKey(employeeId: number | undefined) {
  return ['employees', 'misc-items', employeeId];
}

export function useMiscItems(employeeId: number | undefined) {
  return useQuery({
    queryKey: queryKey(employeeId),
    queryFn: () => api.get<{ items: MiscItem[] }>(`/employees/${employeeId}/misc-items`).then((r) => r.items),
    enabled: employeeId !== undefined,
  });
}

export function useCreateMiscItem(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opis: string) =>
      api.post<{ item: MiscItem }>(`/employees/${employeeId}/misc-items`, { opis }).then((r) => r.item),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(employeeId) }),
  });
}

export function useDeleteMiscItem(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => api.delete(`/employees/${employeeId}/misc-items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKey(employeeId) }),
  });
}

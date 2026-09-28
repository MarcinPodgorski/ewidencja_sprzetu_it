import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ZwrotSprzetuInput } from 'shared';
import { api } from '../../lib/api';
import type { ZwrotSprzetu } from '../../types/entities';

export function useZwroty(employeeId: number | undefined) {
  return useQuery({
    queryKey: ['employees', 'zwroty', employeeId],
    queryFn: () => api.get<{ items: ZwrotSprzetu[] }>(`/employees/${employeeId}/zwroty`).then((r) => r.items),
    enabled: employeeId !== undefined,
  });
}

/** Zwrot zdejmuje przypisania (wszystkie typy sprzętu), usuwa „Różne” i może dezaktywować
 *  pracownika — dlatego odświeżamy wszystko, co dotyczy pracowników i sprzętu. */
export function useZapiszZwrot(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dane: Partial<ZwrotSprzetuInput>) =>
      api.post<{ item: ZwrotSprzetu | null }>(`/employees/${employeeId}/zwrot`, dane).then((r) => r.item),
    onSuccess: () =>
      Promise.all(
        ['employees', 'computers', 'monitors', 'mice', 'keyboards', 'phones', 'sim-cards', 'dashboard', 'equipment-search'].map(
          (klucz) => qc.invalidateQueries({ queryKey: [klucz] }),
        ),
      ),
  });
}

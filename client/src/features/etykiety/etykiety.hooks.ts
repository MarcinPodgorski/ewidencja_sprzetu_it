import { useQuery } from '@tanstack/react-query';
import type { TypZEtykieta } from 'shared';
import { api } from '../../lib/api';
import type { SprzetZEtykieta } from '../../types/entities';

/** Aktywny sprzęt z numerem ewidencyjnym do wyboru na stronie naklejek. */
export function useSprzetDoEtykiet(filtr: { typ?: TypZEtykieta; dzialId?: number }) {
  return useQuery({
    queryKey: ['etykiety', 'sprzet', filtr.typ ?? null, filtr.dzialId ?? null],
    queryFn: () => api.get<{ items: SprzetZEtykieta[] }>('/etykiety/sprzet', filtr).then((r) => r.items),
  });
}

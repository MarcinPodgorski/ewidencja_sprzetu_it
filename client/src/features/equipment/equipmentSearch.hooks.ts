import { useQuery } from '@tanstack/react-query';
import type { EquipmentType } from 'shared';
import { api } from '../../lib/api';
import type { EquipmentSummary } from '../../types/entities';

/** Wyszukiwarka sprzętu (GET /equipment/search) — dostępna każdemu zalogowanemu,
 *  używana do ręcznego dodawania pozycji do spisu oraz przypisywania sprzętu do
 *  pracownika. Opcjonalny `typ` zawęża wynik do jednej kategorii sprzętu. */
export function useEquipmentSearch(query: string, typ?: EquipmentType) {
  return useQuery({
    queryKey: ['equipment-search', query, typ],
    queryFn: () =>
      api.get<{ items: EquipmentSummary[] }>('/equipment/search', { q: query, typ }).then((r) => r.items),
  });
}

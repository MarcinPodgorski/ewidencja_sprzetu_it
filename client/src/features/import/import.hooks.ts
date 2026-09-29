import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ImportInput, TypImportu, WynikImportu } from 'shared';
import { api } from '../../lib/api';

type WierszeImportu = ImportInput['wiersze'];

/** Sprawdzenie bez zapisu — podgląd z interpretacją wartości, błędami i ostrzeżeniami. */
export function useSprawdzImport(typ: TypImportu, wiersze: WierszeImportu, wlaczone: boolean) {
  return useQuery({
    queryKey: ['import', 'sprawdz', typ, wiersze],
    queryFn: () => api.post<WynikImportu>('/import', { typ, wiersze, zapisz: false }),
    enabled: wlaczone,
    staleTime: 0,
    gcTime: 60_000,
  });
}

export function useZapiszImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typ, wiersze }: { typ: TypImportu; wiersze: WierszeImportu }) =>
      api.post<WynikImportu>('/import', { typ, wiersze, zapisz: true }),
    // Import dotyka list sprzętu, pracowników, działów, pulpitu i historii — najprościej odświeżyć wszystko.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

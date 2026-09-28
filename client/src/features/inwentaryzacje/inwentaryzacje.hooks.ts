import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InwentaryzacjaCreateInput, TypZEtykieta } from 'shared';
import { api } from '../../lib/api';
import type { Inwentaryzacja, InwentaryzacjaPozycja, InwentaryzacjaSzczegoly, WynikSkanu } from '../../types/entities';

export function useInwentaryzacje() {
  return useQuery({
    queryKey: ['inwentaryzacje', 'lista'],
    queryFn: () => api.get<{ items: Inwentaryzacja[] }>('/inwentaryzacje').then((r) => r.items),
  });
}

export function useInwentaryzacja(id: number) {
  return useQuery({
    queryKey: ['inwentaryzacje', 'szczegoly', id],
    queryFn: () => api.get<{ item: InwentaryzacjaSzczegoly }>(`/inwentaryzacje/${id}`).then((r) => r.item),
  });
}

/** Sprzęt o danym numerze ewidencyjnym + stan w otwartych inwentaryzacjach (strona skanu QR). */
export function useSkan(numer: string) {
  return useQuery({
    queryKey: ['inwentaryzacje', 'skan', numer],
    queryFn: () => api.get<{ items: WynikSkanu[] }>(`/inwentaryzacje/skan/${encodeURIComponent(numer)}`).then((r) => r.items),
  });
}

/** Potwierdzenie w dowolnym miejscu (lista, skan) zmienia liczniki wszędzie — odświeżamy całość. */
function useOdswiez() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: ['inwentaryzacje'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
}

export function useUtworzInwentaryzacje() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: (dane: InwentaryzacjaCreateInput) =>
      api.post<{ item: Inwentaryzacja }>('/inwentaryzacje', dane).then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function usePotwierdzPozycje() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: ({ inwentaryzacjaId, pozycjaId, uwagi }: { inwentaryzacjaId: number; pozycjaId: number; uwagi?: string | null }) =>
      api
        .post<{ item: InwentaryzacjaPozycja }>(`/inwentaryzacje/${inwentaryzacjaId}/pozycje/${pozycjaId}/potwierdz`, { uwagi })
        .then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function useCofnijPotwierdzenie() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: ({ inwentaryzacjaId, pozycjaId }: { inwentaryzacjaId: number; pozycjaId: number }) =>
      api.post<unknown>(`/inwentaryzacje/${inwentaryzacjaId}/pozycje/${pozycjaId}/cofnij`),
    onSuccess: odswiez,
  });
}

export function useDodajZnaleziony() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: ({ inwentaryzacjaId, sprzetTyp, sprzetId }: { inwentaryzacjaId: number; sprzetTyp: TypZEtykieta; sprzetId: number }) =>
      api
        .post<{ item: InwentaryzacjaPozycja }>(`/inwentaryzacje/${inwentaryzacjaId}/znaleziony`, { sprzetTyp, sprzetId })
        .then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function useZamknijInwentaryzacje() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: (id: number) => api.post<unknown>(`/inwentaryzacje/${id}/zamknij`),
    onSuccess: odswiez,
  });
}

export function useUsunInwentaryzacje() {
  const odswiez = useOdswiez();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/inwentaryzacje/${id}`),
    onSuccess: odswiez,
  });
}

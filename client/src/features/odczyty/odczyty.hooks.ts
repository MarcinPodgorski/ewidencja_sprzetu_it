import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StatusOdczytu } from 'shared';
import { api } from '../../lib/api';
import type { Computer, OdczytKod, OdczytSprzetu, OdczytSzczegoly } from '../../types/entities';

/** Aktywne kody: ogólne (bez parametru) albo przypięte do komputera. */
export function useOdczytKody(computerId?: number) {
  return useQuery({
    queryKey: ['odczyty', 'kody', computerId ?? null],
    queryFn: () => api.get<{ items: OdczytKod[] }>('/odczyty/kody', { computerId }).then((r) => r.items),
  });
}

export function useUtworzKodOdczytu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (computerId?: number) =>
      api.post<{ item: OdczytKod }>('/odczyty/kody', { computerId }).then((r) => r.item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odczyty', 'kody'] }),
  });
}

export function useUniewaznijKodOdczytu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/odczyty/kody/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['odczyty', 'kody'] }),
  });
}

export function useOdczyty(filtry: { status?: StatusOdczytu; computerId?: number } = {}) {
  return useQuery({
    queryKey: ['odczyty', 'lista', filtry.status ?? null, filtry.computerId ?? null],
    queryFn: () => api.get<{ items: OdczytSprzetu[] }>('/odczyty', filtry).then((r) => r.items),
  });
}

export function useOdczyt(id: number) {
  return useQuery({
    queryKey: ['odczyty', 'szczegoly', id],
    queryFn: () => api.get<{ item: OdczytSzczegoly }>(`/odczyty/${id}`).then((r) => r.item),
  });
}

/** Każda decyzja o odczycie może zmienić komputer, listę odczytów i licznik na pulpicie. */
function useOdswiezPoOdczycie() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['odczyty'] }),
      qc.invalidateQueries({ queryKey: ['computers'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
}

export function useZastosujOdczyt() {
  const odswiez = useOdswiezPoOdczycie();
  return useMutation({
    mutationFn: ({ id, pola }: { id: number; pola: Record<string, unknown> }) =>
      api.post<{ item: OdczytSprzetu }>(`/odczyty/${id}/zastosuj`, { pola }).then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function useUtworzKomputerZOdczytu() {
  const odswiez = useOdswiezPoOdczycie();
  return useMutation({
    mutationFn: ({ id, komputer }: { id: number; komputer: Record<string, unknown> }) =>
      api.post<{ item: Computer }>(`/odczyty/${id}/utworz-komputer`, { komputer }).then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function useDopasujOdczyt() {
  const odswiez = useOdswiezPoOdczycie();
  return useMutation({
    mutationFn: ({ id, computerId }: { id: number; computerId: number }) =>
      api.post<{ item: OdczytSprzetu }>(`/odczyty/${id}/dopasuj`, { computerId }).then((r) => r.item),
    onSuccess: odswiez,
  });
}

export function useOdrzucOdczyt() {
  const odswiez = useOdswiezPoOdczycie();
  return useMutation({
    mutationFn: (id: number) => api.post<{ item: OdczytSprzetu }>(`/odczyty/${id}/odrzuc`).then((r) => r.item),
    onSuccess: odswiez,
  });
}

/** Plik JSON zapisany przez skrypt na komputerze bez połączenia z serwerem. */
export function useImportOdczytu() {
  const odswiez = useOdswiezPoOdczycie();
  return useMutation({
    mutationFn: (dane: unknown) => api.post<{ item: OdczytSprzetu }>('/odczyty/import', dane).then((r) => r.item),
    onSuccess: odswiez,
  });
}

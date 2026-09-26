import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EquipmentType } from 'shared';
import { api } from '../../lib/api';
import type { EquipmentSummary } from '../../types/entities';

export interface FakturaPozycja {
  id: number;
  fakturaId: number;
  sprzetTyp: string;
  sprzetId: number;
  /** Obecne tylko w odpowiedzi GET /faktury/:id — rozwiązany opis danej sztuki sprzętu. */
  sprzet?: EquipmentSummary | null;
}

export interface Faktura {
  id: number;
  numer: string;
  numerKsef: string | null;
  kwotaGrosze: number;
  plikPdf: string | null;
  plikXml: string | null;
  createdAt: string;
  updatedAt: string;
  pozycje: FakturaPozycja[];
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['faktury'] });
}

export function useFaktury(q?: string) {
  return useQuery({
    queryKey: ['faktury', 'list', q],
    queryFn: () => api.get<{ items: Faktura[] }>('/faktury', { q: q || undefined }).then((r) => r.items),
  });
}

/** Faktury powiązane z konkretną sztuką sprzętu — sekcja "Faktury" na stronie szczegółów. */
export function useEquipmentFaktury(sprzetTyp: EquipmentType, sprzetId: number | undefined) {
  return useQuery({
    queryKey: ['faktury', 'for-equipment', sprzetTyp, sprzetId],
    queryFn: () => api.get<{ items: Faktura[] }>('/faktury', { sprzetTyp, sprzetId }).then((r) => r.items),
    enabled: sprzetId !== undefined,
  });
}

export function useFaktura(id: number | undefined) {
  return useQuery({
    queryKey: ['faktury', 'detail', id],
    queryFn: () => api.get<{ item: Faktura }>(`/faktury/${id}`).then((r) => r.item),
    enabled: id !== undefined,
  });
}

export function useCreateFaktura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.post<{ item: Faktura }>('/faktury', formData).then((r) => r.item),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateFaktura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      api.put<{ item: Faktura }>(`/faktury/${id}`, formData).then((r) => r.item),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteFaktura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/faktury/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

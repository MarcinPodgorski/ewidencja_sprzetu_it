import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Printer } from '../../types/entities';
import { printersApi } from '../entities';

export function useRelocatePrinter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lokalizacja }: { id: number; lokalizacja: string }) =>
      api.post<{ item: Printer }>(`/printers/${id}/relocate`, { lokalizacja }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [printersApi.queryKey] }),
  });
}

export function useAddPrinterToner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ printerId, tonerId }: { printerId: number; tonerId: number }) =>
      api.post<{ item: Printer }>(`/printers/${printerId}/toners`, { tonerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [printersApi.queryKey] });
      qc.invalidateQueries({ queryKey: ['toners'] });
    },
  });
}

export function useRemovePrinterToner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ printerId, tonerId }: { printerId: number; tonerId: number }) =>
      api.delete<{ item: Printer }>(`/printers/${printerId}/toners/${tonerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [printersApi.queryKey] });
      qc.invalidateQueries({ queryKey: ['toners'] });
    },
  });
}

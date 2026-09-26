import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, wyslijZPostepem } from '../../lib/api';
import type { OnboardingSesja, Oprogramowanie, UstawieniaOnboardingu } from '../../types/entities';

export function useUstawieniaOnboardingu() {
  return useQuery({
    queryKey: ['onboarding', 'ustawienia'],
    queryFn: () => api.get<{ item: UstawieniaOnboardingu }>('/onboarding/ustawienia').then((r) => r.item),
  });
}

export function useZapiszUstawieniaOnboardingu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UstawieniaOnboardingu) =>
      api.put<{ item: UstawieniaOnboardingu }>('/onboarding/ustawienia', data).then((r) => r.item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', 'ustawienia'] }),
  });
}

/** Wygenerowane skrypty — dla jednego komputera albo (bez parametru) 50 ostatnich. */
export function useOnboardingSesje(computerId?: number) {
  return useQuery({
    queryKey: ['onboarding', 'sesje', computerId],
    queryFn: () => api.get<{ items: OnboardingSesja[] }>('/onboarding/sesje', { computerId }).then((r) => r.items),
  });
}

export function useOnboardingSesja(id: number | undefined) {
  return useQuery({
    queryKey: ['onboarding', 'sesja', id],
    queryFn: () => api.get<{ item: OnboardingSesja }>(`/onboarding/sesje/${id}`).then((r) => r.item),
    enabled: id !== undefined,
  });
}

export function useUtworzSesjeOnboardingu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post<{ item: OnboardingSesja }>('/onboarding/sesje', data).then((r) => r.item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding', 'sesje'] });
      // Onboarding może przypisać komputer do pracownika — odśwież karty i historię.
      qc.invalidateQueries({ queryKey: ['computers'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/** Dodanie/edycja pozycji katalogu z plikiem instalacyjnym (multipart) + postęp wysyłki. */
export function useZapiszInstalator() {
  const qc = useQueryClient();
  const [postep, setPostep] = useState<number | null>(null);
  const mutation = useMutation({
    mutationFn: ({ id, formData }: { id?: number; formData: FormData }) =>
      wyslijZPostepem<{ item: Oprogramowanie }>(
        id ? 'PUT' : 'POST',
        id ? `/oprogramowanie/${id}` : '/oprogramowanie',
        formData,
        setPostep,
      ).then((r) => r.item),
    onMutate: () => setPostep(0),
    onSettled: () => setPostep(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oprogramowanie'] });
      qc.invalidateQueries({ queryKey: ['profile-oprogramowania'] });
    },
  });
  return { ...mutation, postep };
}

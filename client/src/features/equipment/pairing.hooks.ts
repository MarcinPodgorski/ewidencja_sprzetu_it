import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

function invalidateBoth(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['mice'] });
  qc.invalidateQueries({ queryKey: ['keyboards'] });
}

export function usePairMouseWithKeyboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mouseId, keyboardId }: { mouseId: number; keyboardId: number }) =>
      api.post(`/mice/${mouseId}/pair`, { keyboardId }),
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useUnpairMouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mouseId: number) => api.post(`/mice/${mouseId}/unpair`),
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useUnpairKeyboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyboardId: number) => api.post(`/keyboards/${keyboardId}/unpair`),
    onSuccess: () => invalidateBoth(qc),
  });
}

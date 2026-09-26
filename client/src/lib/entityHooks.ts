import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

interface HistoryEntry {
  id: number;
  sprzetTyp: string;
  sprzetId: number;
  uzytkownikId: number | null;
  lokalizacja: string | null;
  dataOd: string;
  dataDo: string | null;
  notatka: string | null;
  uzytkownik?: { id: number; imie: string; nazwisko: string; dzial?: { nazwa: string } } | null;
  utworzylAppUser?: { id: number; imie: string; nazwisko: string; login: string } | null;
}

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Generyczny zestaw hooków React Query dla zasobu REST o kształcie
 * GET/POST /path, GET/PUT/DELETE /path/:id — pokrywa wszystkie encje CRUD w systemie.
 * Odpowiednik `createEquipmentRouter` po stronie backendu — ten sam wzorzec, druga strona.
 */
export function createEntityHooks<TItem>(basePath: string, queryKey: string) {
  function useList(query?: Query) {
    return useQuery({
      queryKey: [queryKey, 'list', query],
      queryFn: () => api.get<{ items: TItem[] }>(basePath, query).then((r) => r.items),
    });
  }

  function useDetail(id: number | undefined) {
    return useQuery({
      queryKey: [queryKey, 'detail', id],
      queryFn: () => api.get<{ item: TItem }>(`${basePath}/${id}`).then((r) => r.item),
      enabled: id !== undefined,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: unknown) => api.post<{ item: TItem }>(basePath, data).then((r) => r.item),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: unknown }) =>
        api.put<{ item: TItem }>(`${basePath}/${id}`, data).then((r) => r.item),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  function useArchive() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number) => api.delete<{ item: TItem }>(`${basePath}/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  /** Odwrotność useArchive — przywraca sprzęt do statusu aktywnego. */
  function useRestore() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: number) => api.post<{ item: TItem }>(`${basePath}/${id}/restore`),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  function useAssign() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, employeeId, notatka }: { id: number; employeeId: number; notatka?: string }) =>
        api.post<{ item: TItem }>(`${basePath}/${id}/assign`, { employeeId, notatka }),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  function useUnassign() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, notatka }: { id: number; notatka?: string }) =>
        api.post<{ item: TItem }>(`${basePath}/${id}/unassign`, { notatka }),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
    });
  }

  function useHistory(id: number | undefined) {
    return useQuery({
      queryKey: [queryKey, 'history', id],
      queryFn: () => api.get<{ history: HistoryEntry[] }>(`${basePath}/${id}/history`).then((r) => r.history),
      enabled: id !== undefined,
    });
  }

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useArchive,
    useRestore,
    useAssign,
    useUnassign,
    useHistory,
    queryKey,
    basePath,
  };
}

export type { HistoryEntry };

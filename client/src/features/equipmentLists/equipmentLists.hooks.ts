import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { EquipmentList, EquipmentListItem, EquipmentListPermission } from '../../types/entities';

const KEY = 'equipment-lists';

export function useEquipmentLists() {
  return useQuery({
    queryKey: [KEY, 'list'],
    queryFn: () => api.get<{ items: EquipmentList[] }>('/equipment-lists').then((r) => r.items),
  });
}

export type AccessLevel = 'ADMIN' | 'VIEW' | 'EDIT';

export function useEquipmentList(id: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () =>
      api.get<{ list: EquipmentList; myAccessLevel: AccessLevel }>(`/equipment-lists/${id}`),
    enabled: id !== undefined,
  });
}

export function useCreateEquipmentList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nazwa: string; dzialId: number; opis?: string | null }) =>
      api.post<{ list: EquipmentList }>('/equipment-lists', data).then((r) => r.list),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateEquipmentList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nazwa?: string; dzialId?: number; opis?: string | null } }) =>
      api.put<{ list: EquipmentList }>(`/equipment-lists/${id}`, data).then((r) => r.list),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteEquipmentList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/equipment-lists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAddListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, sprzetTyp, sprzetId }: { listId: number; sprzetTyp: string; sprzetId: number }) =>
      api.post<{ item: EquipmentListItem }>(`/equipment-lists/${listId}/items`, { sprzetTyp, sprzetId }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.listId] }),
  });
}

export function useRemoveListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: number; itemId: number }) =>
      api.delete(`/equipment-lists/${listId}/items/${itemId}`),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.listId] }),
  });
}

export function useListPermissions(listId: number | undefined) {
  return useQuery({
    queryKey: [KEY, 'permissions', listId],
    queryFn: () =>
      api.get<{ permissions: EquipmentListPermission[] }>(`/equipment-lists/${listId}/permissions`).then(
        (r) => r.permissions,
      ),
    enabled: listId !== undefined,
  });
}

export function useGrantPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, appUserId, poziom }: { listId: number; appUserId: number; poziom: 'VIEW' | 'EDIT' }) =>
      api.post(`/equipment-lists/${listId}/permissions`, { appUserId, poziom }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [KEY, 'permissions', vars.listId] }),
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, permId, poziom }: { listId: number; permId: number; poziom: 'VIEW' | 'EDIT' }) =>
      api.put(`/equipment-lists/${listId}/permissions/${permId}`, { poziom }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [KEY, 'permissions', vars.listId] }),
  });
}

export function useRevokePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, permId }: { listId: number; permId: number }) =>
      api.delete(`/equipment-lists/${listId}/permissions/${permId}`),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: [KEY, 'permissions', vars.listId] }),
  });
}

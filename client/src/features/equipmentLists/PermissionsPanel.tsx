import { useState } from 'react';
import { appUsersApi } from '../entities';
import {
  useGrantPermission,
  useListPermissions,
  useRevokePermission,
  useUpdatePermission,
} from './equipmentLists.hooks';

export function PermissionsPanel({ listId }: { listId: number }) {
  const { data: permissions } = useListPermissions(listId);
  const { data: appUsers } = appUsersApi.useList();
  const grantMutation = useGrantPermission();
  const updateMutation = useUpdatePermission();
  const revokeMutation = useRevokePermission();

  const [appUserId, setAppUserId] = useState('');
  const [poziom, setPoziom] = useState<'VIEW' | 'EDIT'>('VIEW');

  const grantedIds = new Set((permissions ?? []).map((p) => p.appUserId));
  const candidates = (appUsers ?? []).filter((u) => u.rola === 'USER' && !grantedIds.has(u.id));

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Uprawnienia</h2>

      {permissions && permissions.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {permissions.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {p.appUser ? `${p.appUser.imie} ${p.appUser.nazwisko} (${p.appUser.login})` : `#${p.appUserId}`}
              </span>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border-0 py-1 text-xs ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600"
                  value={p.poziom}
                  disabled={updateMutation.isPending}
                  onChange={(e) =>
                    updateMutation.mutate({ listId, permId: p.id, poziom: e.target.value as 'VIEW' | 'EDIT' })
                  }
                >
                  <option value="VIEW">podgląd</option>
                  <option value="EDIT">edycja</option>
                </select>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate({ listId, permId: p.id })}
                >
                  usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Nikt jeszcze nie ma dostępu do tego spisu.</p>
      )}

      <div className="flex items-center gap-2">
        <select className="input" value={appUserId} onChange={(e) => setAppUserId(e.target.value)}>
          <option value="">Wybierz użytkownika…</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.imie} {u.nazwisko} ({u.login})
            </option>
          ))}
        </select>
        <select
          className="rounded-md border-0 py-2 text-sm ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600"
          value={poziom}
          onChange={(e) => setPoziom(e.target.value as 'VIEW' | 'EDIT')}
        >
          <option value="VIEW">podgląd</option>
          <option value="EDIT">edycja</option>
        </select>
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={!appUserId || grantMutation.isPending}
          onClick={() => {
            grantMutation.mutate({ listId, appUserId: Number(appUserId), poziom });
            setAppUserId('');
          }}
        >
          Nadaj
        </button>
      </div>
    </div>
  );
}

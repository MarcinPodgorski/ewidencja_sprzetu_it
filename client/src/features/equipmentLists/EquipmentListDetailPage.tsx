import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../auth/AuthContext';
import { AddListItemWidget } from './AddListItemWidget';
import { PermissionsPanel } from './PermissionsPanel';
import {
  useAddListItem,
  useDeleteEquipmentList,
  useEquipmentList,
  useRemoveListItem,
} from './equipmentLists.hooks';

export function EquipmentListDetailPage() {
  const { id } = useParams();
  const listId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useEquipmentList(listId);
  const addItemMutation = useAddListItem();
  const removeItemMutation = useRemoveListItem();
  const deleteMutation = useDeleteEquipmentList();

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (isError || !data) {
    return (
      <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
        Nie znaleziono tego spisu albo nie masz do niego dostępu.
      </div>
    );
  }

  const { list, myAccessLevel } = data;
  const canEdit = myAccessLevel === 'ADMIN' || myAccessLevel === 'EDIT';
  const isAdmin = user?.rola === 'ADMIN';
  const existingKeys = new Set((list.items ?? []).map((it) => `${it.sprzetTyp}-${it.sprzetId}`));

  return (
    <div>
      <PageHeader
        title={list.nazwa}
        subtitle={`Dział: ${list.dzial?.nazwa ?? '—'}${list.opis ? ` · ${list.opis}` : ''}`}
        backTo="/equipment-lists"
        actions={
          isAdmin && (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              Usuń spis
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Pozycje ({list.items?.length ?? 0})</h2>
          {list.items && list.items.length > 0 ? (
            <div className="card overflow-x-auto p-0">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Identyfikator</th>
                    <th>Opis</th>
                    <th>Użytkownik</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((it) => {
                    const typ = it.sprzetTyp as EquipmentType;
                    return (
                      <tr key={it.id}>
                        <td>{EQUIPMENT_TYPE_LABELS[typ]}</td>
                        <td
                          className="cursor-pointer text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          onClick={() => navigate(`/${EQUIPMENT_API_SEGMENT[typ]}/${it.sprzetId}`)}
                        >
                          {it.sprzet?.identyfikator ?? `#${it.sprzetId}`}
                        </td>
                        <td>{it.sprzet?.opis ?? '—'}</td>
                        <td>
                          {it.sprzet?.aktualnyUzytkownik
                            ? `${it.sprzet.aktualnyUzytkownik.imie} ${it.sprzet.aktualnyUzytkownik.nazwisko}`
                            : '—'}
                        </td>
                        {canEdit && (
                          <td>
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                              disabled={removeItemMutation.isPending}
                              onClick={() => removeItemMutation.mutate({ listId, itemId: it.id })}
                            >
                              usuń
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Ten spis nie ma jeszcze żadnych pozycji.</div>
          )}
        </div>

        <div className="space-y-6">
          {canEdit && (
            <AddListItemWidget
              existingKeys={existingKeys}
              busy={addItemMutation.isPending}
              onAdd={(sprzetTyp, sprzetId) => addItemMutation.mutate({ listId, sprzetTyp, sprzetId })}
            />
          )}
          {isAdmin && <PermissionsPanel listId={listId} />}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć ten spis?"
        description="Spis, jego pozycje i nadane uprawnienia zostaną trwale usunięte. Sam sprzęt pozostanie w ewidencji."
        confirmLabel="Usuń"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(listId, {
            onSuccess: () => navigate('/equipment-lists'),
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

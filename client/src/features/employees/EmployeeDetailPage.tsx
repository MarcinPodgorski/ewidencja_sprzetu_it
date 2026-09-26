import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { employeesApi } from '../entities';
import { AssignEquipmentModal } from './AssignEquipmentModal';
import { useEmployeeEquipment, useEmployeeHistory } from './employees.hooks';
import { MiscItemsSection } from './MiscItemsSection';

export function EmployeeDetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const { data: employee, isLoading, isError } = employeesApi.useDetail(numId);
  const { data: equipment } = useEmployeeEquipment(numId);
  const { data: history } = useEmployeeHistory(numId);
  const deactivateMutation = employeesApi.useArchive();

  if (isLoading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  }

  if (isError || !employee) {
    return (
      <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
        Nie znaleziono tego pracownika. Mógł zostać usunięty albo link jest nieprawidłowy.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${employee.imie} ${employee.nazwisko}`}
        subtitle={[employee.stanowisko, employee.dzial?.nazwa ?? '—', employee.email].filter(Boolean).join(' · ')}
        backTo="/employees"
        actions={
          <>
            <Link to={`/protocols/new?employeeId=${employee.id}`} className="btn-secondary">
              Generuj protokół
            </Link>
            <Link to={`/employees/${employee.id}/edit`} className="btn-secondary">
              Edytuj
            </Link>
            {employee.aktywny && (
              <>
                <button type="button" className="btn-primary" onClick={() => setAssignModalOpen(true)}>
                  Przypisz sprzęt
                </button>
                <button type="button" className="btn-danger" onClick={() => setConfirmDeactivate(true)}>
                  Dezaktywuj
                </button>
              </>
            )}
          </>
        }
      />

      {!employee.aktywny && (
        <div className="mb-6 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Ten pracownik jest nieaktywny.
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Przypisany sprzęt</h2>
        {equipment && equipment.length > 0 ? (
          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Identyfikator</th>
                  <th>Marka/model</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => {
                  const typ = item.sprzetTyp as EquipmentType;
                  const segment = EQUIPMENT_API_SEGMENT[typ];
                  const idf = typ === 'KARTA_SIM' ? item.iccid : item.numerEwidencyjny;
                  return (
                    <tr
                      key={`${typ}-${item.id}`}
                      className="cursor-pointer"
                      onClick={() => navigate(`/${segment}/${item.id}`)}
                    >
                      <td>{EQUIPMENT_TYPE_LABELS[typ]}</td>
                      <td>{idf}</td>
                      <td>{item.markaModel ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Brak przypisanego sprzętu.</div>
        )}
      </div>

      <MiscItemsSection employeeId={employee.id} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Historia przypisań</h2>
        {!history ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie historii…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Brak historii przypisań.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Sprzęt</th>
                  <th>Od</th>
                  <th>Do</th>
                  <th>Notatka</th>
                  <th>Zarejestrował</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const typ = h.sprzetTyp as EquipmentType;
                  return (
                    <tr key={h.id}>
                      <td>
                        {EQUIPMENT_TYPE_LABELS[typ]}
                        {h.sprzet ? ` — ${h.sprzet.identyfikator}` : ''}
                      </td>
                      <td>{new Date(h.dataOd).toLocaleString('pl-PL')}</td>
                      <td>
                        {h.dataDo ? (
                          new Date(h.dataDo).toLocaleString('pl-PL')
                        ) : (
                          <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">obecnie</span>
                        )}
                      </td>
                      <td>{h.notatka ?? '—'}</td>
                      <td>{h.utworzylAppUser ? h.utworzylAppUser.login : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Dezaktywować tego pracownika?"
        description="Pracownik zniknie z list wyboru przy przypisywaniu nowego sprzętu. Historia i bieżące przypisania pozostaną zachowane."
        confirmLabel="Dezaktywuj"
        danger
        busy={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate(employee.id, { onSuccess: () => setConfirmDeactivate(false) })}
        onCancel={() => setConfirmDeactivate(false)}
      />

      {assignModalOpen && (
        <AssignEquipmentModal employeeId={employee.id} onClose={() => setAssignModalOpen(false)} />
      )}
    </div>
  );
}

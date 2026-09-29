import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, type EquipmentType } from 'shared';
import { HistoriaZmian, type PoleHistorii } from '../../components/HistoriaZmian';
import { PageHeader } from '../../components/PageHeader';
import { apiUrl } from '../../lib/api';
import { employeesApi } from '../entities';
import { AssignEquipmentModal } from './AssignEquipmentModal';
import { useEmployeeEquipment, useEmployeeHistory } from './employees.hooks';
import { useMiscItems } from './miscItems.hooks';
import { MiscItemsSection } from './MiscItemsSection';
import { useZwroty } from './zwroty.hooks';

const POLA_HISTORII: Record<string, PoleHistorii> = {
  imie: { etykieta: 'Imię' },
  nazwisko: { etykieta: 'Nazwisko' },
  stanowisko: { etykieta: 'Stanowisko' },
  email: { etykieta: 'E-mail' },
  dzial: { etykieta: 'Dział' },
  aktywny: { etykieta: 'Aktywny', format: (v) => (v ? 'tak' : 'nie') },
};

export function EmployeeDetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const { data: employee, isLoading, isError } = employeesApi.useDetail(numId);
  const { data: equipment } = useEmployeeEquipment(numId);
  const { data: miscItems } = useMiscItems(numId);
  const { data: history } = useEmployeeHistory(numId);
  const { data: zwroty } = useZwroty(numId);

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
                {/* Dezaktywacja przez odejście: zwrot sprzętu + protokół + lista kontrolna (albo sama dezaktywacja). */}
                <Link to={`/employees/${employee.id}/zwrot?odejscie=1`} className="btn-danger">
                  Odejście pracownika
                </Link>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Przypisany sprzęt</h2>
          {((equipment?.length ?? 0) > 0 || (miscItems?.length ?? 0) > 0) && (
            <Link to={`/employees/${employee.id}/zwrot`} className="btn-secondary text-xs">
              Zwrot sprzętu
            </Link>
          )}
        </div>
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

      {zwroty && zwroty.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Protokoły zwrotu</h2>
          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Rodzaj</th>
                  <th>Zwrócone pozycje</th>
                  <th>Zarejestrował</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {zwroty.map((z) => (
                  <tr key={z.id}>
                    <td className="whitespace-nowrap">{new Date(z.createdAt).toLocaleString('pl-PL')}</td>
                    <td>
                      {z.odejscie ? (
                        <span className="badge bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">odejście</span>
                      ) : (
                        'zwrot'
                      )}
                    </td>
                    <td className="max-w-md truncate" title={z.pozycje.map((p) => p.identyfikator).join(', ')}>
                      {z.pozycje.map((p) => p.identyfikator).join(', ')}
                      {z.pozostale.length > 0 && (
                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                          ({z.odejscie ? 'niezwrócone' : 'zostało u pracownika'}: {z.pozostale.length})
                        </span>
                      )}
                    </td>
                    <td>{z.utworzylAppUser?.login ?? '—'}</td>
                    <td className="text-right">
                      <a
                        href={apiUrl(`/employees/${employee.id}/zwroty/${z.id}/protokol`)}
                        download
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      <HistoriaZmian encja="PRACOWNIK" encjaId={employee.id} kluczOdswiezania="employees" pola={POLA_HISTORII} />

      {assignModalOpen && (
        <AssignEquipmentModal employeeId={employee.id} onClose={() => setAssignModalOpen(false)} />
      )}
    </div>
  );
}

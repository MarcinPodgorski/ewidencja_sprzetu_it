import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useDashboardStats } from '../features/dashboard/dashboard.hooks';

interface StatTileProps {
  label: string;
  value: number;
  to: string;
}

function StatTile({ label, value, to }: StatTileProps) {
  return (
    <Link to={to} className="card block transition-shadow hover:shadow-md">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </Link>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading || !data) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie statystyk…</div>;
  }

  const { counts, alerts } = data;
  const hasAlerts = alerts.lowToners.length > 0 || alerts.expiringSimCards.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sprzęt w ewidencji</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Komputery" value={counts.computers} to="/computers" />
          <StatTile label="Monitory" value={counts.monitors} to="/monitors" />
          <StatTile label="Myszy" value={counts.mice} to="/mice" />
          <StatTile label="Klawiatury" value={counts.keyboards} to="/keyboards" />
          <StatTile label="Telefony" value={counts.phones} to="/phones" />
          <StatTile label="Karty SIM" value={counts.simCards} to="/sim-cards" />
          <StatTile label="Drukarki" value={counts.printers} to="/printers" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Organizacja</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Pracownicy" value={counts.employees} to="/employees" />
          <StatTile label="Konta aplikacji" value={counts.appUsers} to="/app-users" />
          <StatTile label="Spisy sprzętu" value={counts.equipmentLists} to="/equipment-lists" />
        </div>
      </div>

      {hasAlerts && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Wymaga uwagi</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {alerts.lowToners.length > 0 && (
              <div className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">⚠ niski stan</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tonery/tusze na wyczerpaniu</h3>
                </div>
                <ul className="space-y-1 text-sm">
                  {alerts.lowToners.map((t) => (
                    <li key={t.id} className="flex justify-between">
                      <Link to="/toners" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        {t.oznaczenie}
                      </Link>
                      <span className={t.ilosc === 0 ? 'font-medium text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>
                        {t.ilosc} szt.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alerts.expiringSimCards.length > 0 && (
              <div className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">⚠ umowa wygasa</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Karty SIM — kończące się umowy</h3>
                </div>
                <ul className="space-y-1 text-sm">
                  {alerts.expiringSimCards.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <Link to={`/sim-cards/${s.id}`} className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        {s.numerTelefonu}
                      </Link>
                      <span className="text-amber-700 dark:text-amber-400">{new Date(s.dataKoncaUmowy).toLocaleDateString('pl-PL')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Witaj, {user?.imie}!</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {user?.rola === 'ADMIN'
          ? 'Przegląd ewidencji sprzętu IT.'
          : 'Wybierz spis sprzętu z menu po lewej, aby przeglądać przypisane pozycje.'}
      </p>
      {user?.rola === 'ADMIN' && <AdminDashboard />}
    </div>
  );
}

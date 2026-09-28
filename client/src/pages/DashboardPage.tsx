import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CardSim,
  ClipboardCheck,
  Cpu,
  ClipboardList,
  KeyRound,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Printer,
  Smartphone,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDashboardStats } from '../features/dashboard/dashboard.hooks';
import { odmiana } from '../lib/odmiana';
import { PasekPostepu } from '../features/inwentaryzacje/utils';

interface StatTileProps {
  label: string;
  value: number;
  to: string;
  icon: LucideIcon;
  /** Klasy gradientu kafelka ikony, np. "from-indigo-500 to-violet-500". */
  kolor: string;
  /** Pozycja kafelka — kafelki wchodzą kaskadowo, jeden po drugim. */
  indeks: number;
}

function StatTile({ label, value, to, icon: Ikona, kolor, indeks }: StatTileProps) {
  return (
    <Link
      to={to}
      className="card card-interactive group relative block animate-page-in"
      style={{ animationDelay: `${indeks * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${kolor} text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`}
        >
          <Ikona className="h-5 w-5" />
        </span>
      </div>
      <span className="absolute bottom-3 right-5 inline-flex -translate-x-1 items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 dark:text-indigo-300">
        Przejdź <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading || !data) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie statystyk…</div>;
  }

  const { counts, alerts } = data;
  const hasAlerts =
    alerts.lowToners.length > 0 ||
    alerts.expiringSimCards.length > 0 ||
    alerts.odczytyDoPrzejrzenia > 0 ||
    alerts.inwentaryzacjeWToku.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sprzęt w ewidencji</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Komputery" value={counts.computers} to="/computers" icon={Laptop} kolor="from-indigo-500 to-violet-500" indeks={0} />
          <StatTile label="Monitory" value={counts.monitors} to="/monitors" icon={Monitor} kolor="from-sky-500 to-indigo-500" indeks={1} />
          <StatTile label="Myszy" value={counts.mice} to="/mice" icon={Mouse} kolor="from-violet-500 to-fuchsia-500" indeks={2} />
          <StatTile label="Klawiatury" value={counts.keyboards} to="/keyboards" icon={Keyboard} kolor="from-fuchsia-500 to-pink-500" indeks={3} />
          <StatTile label="Telefony" value={counts.phones} to="/phones" icon={Smartphone} kolor="from-emerald-500 to-teal-500" indeks={4} />
          <StatTile label="Karty SIM" value={counts.simCards} to="/sim-cards" icon={CardSim} kolor="from-amber-400 to-orange-500" indeks={5} />
          <StatTile label="Drukarki" value={counts.printers} to="/printers" icon={Printer} kolor="from-rose-500 to-pink-500" indeks={6} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Organizacja</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Pracownicy" value={counts.employees} to="/employees" icon={Users} kolor="from-indigo-500 to-sky-500" indeks={7} />
          <StatTile label="Konta aplikacji" value={counts.appUsers} to="/app-users" icon={KeyRound} kolor="from-slate-500 to-slate-700" indeks={8} />
          <StatTile label="Spisy sprzętu" value={counts.equipmentLists} to="/equipment-lists" icon={ClipboardList} kolor="from-teal-500 to-emerald-500" indeks={9} />
        </div>
      </div>

      {hasAlerts && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Wymaga uwagi</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {alerts.inwentaryzacjeWToku.length > 0 && (
              <div className="card">
                <div className="mb-3 flex items-center gap-2">
                  <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                    <ClipboardCheck className="h-3 w-3" />
                    w toku</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Inwentaryzacja</h3>
                </div>
                <ul className="space-y-3">
                  {alerts.inwentaryzacjeWToku.map((inw) => (
                    <li key={inw.id}>
                      <Link to={`/inwentaryzacje/${inw.id}`} className="mb-1 block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        {inw.nazwa}
                      </Link>
                      <PasekPostepu potwierdzone={inw.liczbaPotwierdzonych} wszystkie={inw.liczbaPozycji} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alerts.odczytyDoPrzejrzenia > 0 && (
              <div className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    <Cpu className="h-3 w-3" />
                    odczyt sprzętu</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Odczyty do przejrzenia</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Z komputerów {odmiana(alerts.odczytyDoPrzejrzenia, ['przyszedł', 'przyszły', 'przyszło'])} {alerts.odczytyDoPrzejrzenia}{' '}
                  {odmiana(alerts.odczytyDoPrzejrzenia, ['odczyt', 'odczyty', 'odczytów'])} — sprawdź zmiany przed zapisaniem w
                  ewidencji.{' '}
                  <Link to="/odczyty" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Przejrzyj
                  </Link>
                </p>
              </div>
            )}

            {alerts.lowToners.length > 0 && (
              <div className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <TriangleAlert className="h-3 w-3" />
                    niski stan</span>
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
                  <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <TriangleAlert className="h-3 w-3" />
                    umowa wygasa</span>
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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        Witaj, <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-300 dark:to-violet-300">{user?.imie}</span>! 👋
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {user?.rola === 'ADMIN'
          ? 'Przegląd ewidencji sprzętu IT.'
          : 'Wybierz spis sprzętu z menu po lewej, aby przeglądać przypisane pozycje.'}
      </p>
      {user?.rola === 'ADMIN' && <AdminDashboard />}
    </div>
  );
}

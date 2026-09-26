import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Ogólne',
    items: [
      { to: '/', label: 'Pulpit' },
      { to: '/equipment-lists', label: 'Spisy sprzętu' },
    ],
  },
  {
    title: 'Sprzęt',
    items: [
      { to: '/computers', label: 'Komputery', adminOnly: true },
      { to: '/monitors', label: 'Monitory', adminOnly: true },
      { to: '/mice', label: 'Myszy', adminOnly: true },
      { to: '/keyboards', label: 'Klawiatury', adminOnly: true },
      { to: '/phones', label: 'Telefony', adminOnly: true },
      { to: '/sim-cards', label: 'Karty SIM', adminOnly: true },
      { to: '/printers', label: 'Drukarki', adminOnly: true },
      { to: '/toners', label: 'Tonery/tusze', adminOnly: true },
    ],
  },
  {
    title: 'Administracja',
    items: [
      { to: '/employees', label: 'Pracownicy', adminOnly: true },
      { to: '/faktury', label: 'Faktury', adminOnly: true },
      { to: '/onboarding', label: 'Onboarding', adminOnly: true },
      { to: '/departments', label: 'Działy', adminOnly: true },
      { to: '/app-users', label: 'Konta aplikacji', adminOnly: true },
      { to: '/protocols/new', label: 'Protokół przekazania', adminOnly: true },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      // Wylogowanie po stronie klienta i tak czyści stan — błąd sieciowy tu nie blokuje UX.
      console.error(err instanceof ApiError ? err.message : err);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ewidencja sprzętu</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">IT</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.adminOnly || user?.rola === 'ADMIN');
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.title}
                </p>
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `block rounded-md px-2 py-1.5 text-sm font-medium ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div />
          <div className="flex items-center gap-2">
            {user && (
              <NavLink
                to="/profile"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                {user.imie} {user.nazwisko}{' '}
                <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {user.rola === 'ADMIN' ? 'admin' : 'user'}
                </span>
              </NavLink>
            )}
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="btn-secondary text-sm">
              Wyloguj
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Boxes,
  Building2,
  CardSim,
  ClipboardList,
  Droplets,
  FileSignature,
  KeyRound,
  Keyboard,
  Laptop,
  LayoutDashboard,
  LogOut,
  Monitor,
  Mouse,
  Printer,
  Receipt,
  Rocket,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { Backdrop } from './Backdrop';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
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
      { to: '/', label: 'Pulpit', icon: LayoutDashboard },
      { to: '/equipment-lists', label: 'Spisy sprzętu', icon: ClipboardList },
    ],
  },
  {
    title: 'Sprzęt',
    items: [
      { to: '/computers', label: 'Komputery', icon: Laptop, adminOnly: true },
      { to: '/monitors', label: 'Monitory', icon: Monitor, adminOnly: true },
      { to: '/mice', label: 'Myszy', icon: Mouse, adminOnly: true },
      { to: '/keyboards', label: 'Klawiatury', icon: Keyboard, adminOnly: true },
      { to: '/phones', label: 'Telefony', icon: Smartphone, adminOnly: true },
      { to: '/sim-cards', label: 'Karty SIM', icon: CardSim, adminOnly: true },
      { to: '/printers', label: 'Drukarki', icon: Printer, adminOnly: true },
      { to: '/toners', label: 'Tonery/tusze', icon: Droplets, adminOnly: true },
    ],
  },
  {
    title: 'Administracja',
    items: [
      { to: '/employees', label: 'Pracownicy', icon: Users, adminOnly: true },
      { to: '/faktury', label: 'Faktury', icon: Receipt, adminOnly: true },
      { to: '/onboarding', label: 'Onboarding', icon: Rocket, adminOnly: true },
      { to: '/departments', label: 'Działy', icon: Building2, adminOnly: true },
      { to: '/app-users', label: 'Konta aplikacji', icon: KeyRound, adminOnly: true },
      { to: '/protocols/new', label: 'Protokół przekazania', icon: FileSignature, adminOnly: true },
    ],
  },
];

function inicjaly(imie?: string, nazwisko?: string): string {
  return `${imie?.[0] ?? ''}${nazwisko?.[0] ?? ''}`.toUpperCase() || '?';
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      // Wylogowanie po stronie klienta i tak czyści stan — błąd sieciowy tu nie blokuje UX.
      console.error(err instanceof ApiError ? err.message : err);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen">
      <Backdrop />

      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-gray-950/50">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-transform duration-500 hover:-rotate-6 hover:scale-105">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight text-gray-900 dark:text-gray-100">Ewidencja sprzętu</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dział IT</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.adminOnly || user?.rola === 'ADMIN');
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.title}
                </p>
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition duration-200 active:scale-[0.98] ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/5 text-indigo-700 dark:from-indigo-400/20 dark:to-violet-400/5 dark:text-indigo-200'
                            : 'text-gray-600 hover:translate-x-0.5 hover:bg-gray-900/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 animate-fade-in" />
                          )}
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                              isActive
                                ? 'text-indigo-600 dark:text-indigo-300'
                                : 'text-gray-400 group-hover:text-indigo-500 dark:text-gray-500 dark:group-hover:text-indigo-300'
                            }`}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/60 bg-white/60 px-6 py-2.5 backdrop-blur-xl dark:border-white/5 dark:bg-gray-950/40">
          <div />
          <div className="flex items-center gap-2">
            {user && (
              <NavLink
                to="/profile"
                className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition duration-200 hover:bg-gray-900/[0.04] active:scale-[0.98] dark:hover:bg-white/5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-sm ring-2 ring-white transition-transform duration-300 group-hover:scale-105 dark:ring-gray-900">
                  {inicjaly(user.imie, user.nazwisko)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {user.imie} {user.nazwisko}
                </span>
                <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                  {user.rola === 'ADMIN' ? 'admin' : 'user'}
                </span>
              </NavLink>
            )}
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="btn-secondary text-sm">
              <LogOut className="h-4 w-4" />
              Wyloguj
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          {/* key = ścieżka: każda zmiana strony odtwarza łagodne wejście treści. */}
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

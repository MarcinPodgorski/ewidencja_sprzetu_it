import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Boxes, LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PaletaWyszukiwania, SKROT_SZUKANIA } from '../features/szukaj/PaletaWyszukiwania';
import { ApiError } from '../lib/api';
import { Backdrop } from './Backdrop';
import { grupyDlaRoli } from './nawigacja';
import { ThemeToggle } from './ThemeToggle';

function inicjaly(imie?: string, nazwisko?: string): string {
  return `${imie?.[0] ?? ''}${nazwisko?.[0] ?? ''}`.toUpperCase() || '?';
}

function Logo() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition-transform duration-500 hover:-rotate-6 hover:scale-105">
      <Boxes className="h-5 w-5" />
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const admin = user?.rola === 'ADMIN';
  const [paleta, setPaleta] = useState(false);
  // Na telefonie i wąskim oknie menu jest wysuwane (poniżej lg), na szerokim ekranie stale widoczne.
  const [menu, setMenu] = useState(false);

  // Ctrl+K / ⌘K z każdego miejsca aplikacji (wyszukiwarka przeszukuje całą ewidencję — tylko admin).
  useEffect(() => {
    if (!admin) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenu(false);
        setPaleta((otwarta) => !otwarta);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [admin]);

  useEffect(() => {
    setPaleta(false);
    setMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menu) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu]);

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

      {menu && (
        <div
          className="fixed inset-0 z-30 bg-gray-950/40 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={() => setMenu(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="menu-glowne"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-white/60 bg-white/95 backdrop-blur-xl transition-[transform,visibility] duration-300 ease-out dark:border-white/5 dark:bg-gray-950/95 lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:bg-white/70 lg:dark:bg-gray-950/50 ${
          menu ? 'visible translate-x-0 shadow-2xl' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-4">
          <Logo />
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-bold leading-tight text-gray-900 dark:text-gray-100">Ewidencja sprzętu</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dział IT</p>
          </div>
          <button
            type="button"
            onClick={() => setMenu(false)}
            className="-mr-2 rounded-lg p-2 text-gray-400 hover:bg-gray-900/[0.04] hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200 lg:hidden"
            aria-label="Zamknij menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-6 pt-2">
          {grupyDlaRoli(user?.rola).map((group) => (
            <div key={group.title}>
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.title}
              </p>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] lg:py-1.5 ${
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
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/60 bg-white/60 px-3 py-2.5 backdrop-blur-xl dark:border-white/5 dark:bg-gray-950/40 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenu(true)}
            className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-900/[0.04] dark:text-gray-300 dark:hover:bg-white/5 lg:hidden"
            aria-label="Otwórz menu"
            aria-expanded={menu}
            aria-controls="menu-glowne"
          >
            <Menu className="h-5 w-5" />
          </button>
          <NavLink to="/" className="flex min-w-0 items-center gap-2 lg:hidden" aria-label="Pulpit">
            <Logo />
            <span className="hidden truncate text-sm font-bold text-gray-900 dark:text-gray-100 min-[420px]:inline">
              Ewidencja sprzętu
            </span>
          </NavLink>

          {admin && (
            <button
              type="button"
              onClick={() => setPaleta(true)}
              aria-label="Szukaj w ewidencji"
              aria-keyshortcuts="Control+K Meta+K"
              className="group ml-auto flex min-w-0 items-center gap-2 rounded-lg border border-gray-200/80 bg-white/70 p-2 text-sm text-gray-500 shadow-sm transition duration-200 hover:border-indigo-300 hover:text-gray-700 active:scale-[0.99] dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-indigo-400/40 dark:hover:text-gray-200 sm:w-72 sm:px-3 sm:py-1.5 lg:ml-0"
            >
              <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-300" />
              <span className="hidden truncate sm:inline">Szukaj w ewidencji…</span>
              <kbd className="ml-auto hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 md:inline">
                {SKROT_SZUKANIA}
              </kbd>
            </button>
          )}

          <div className={`flex shrink-0 items-center gap-1 sm:gap-2 ${admin ? '' : 'ml-auto'} lg:ml-auto`}>
            {user && (
              <NavLink
                to="/profile"
                className="group flex items-center gap-2.5 rounded-full p-1 transition duration-200 hover:bg-gray-900/[0.04] active:scale-[0.98] dark:hover:bg-white/5 sm:pr-3"
                aria-label="Mój profil"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white shadow-sm ring-2 ring-white transition-transform duration-300 group-hover:scale-105 dark:ring-gray-900">
                  {inicjaly(user.imie, user.nazwisko)}
                </span>
                <span className="hidden text-sm text-gray-700 dark:text-gray-200 md:inline">
                  {user.imie} {user.nazwisko}
                </span>
                <span className="badge hidden bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300 sm:inline-flex">
                  {user.rola === 'ADMIN' ? 'admin' : 'user'}
                </span>
              </NavLink>
            )}
            <ThemeToggle />
            <button type="button" onClick={handleLogout} className="btn-secondary px-2.5 text-sm sm:px-3" aria-label="Wyloguj">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:p-6">
          {/* key = ścieżka: każda zmiana strony odtwarza łagodne wejście treści. */}
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>

      <PaletaWyszukiwania otwarta={paleta} onZamknij={() => setPaleta(false)} />
    </div>
  );
}

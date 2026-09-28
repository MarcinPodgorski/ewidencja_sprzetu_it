import { SYSTEM_OPERACYJNY_LABELS, rodzinaSystemu, type SystemOperacyjny } from 'shared';

/**
 * Loga systemów operacyjnych jako proste SVG (bez zależności od biblioteki ikon).
 * Kolory marek są dobrane pod jasne tło — dlatego SystemBadge podkłada pod logo
 * jasny kafelek, także w ciemnym motywie (jak ikony aplikacji).
 */
export function OsIcon({ system, className = 'h-4 w-4' }: { system: SystemOperacyjny; className?: string }) {
  switch (rodzinaSystemu(system)) {
    case 'WINDOWS':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="#0078D4" d="M3 3h8.5v8.5H3zm9.5 0H21v8.5h-8.5zM3 12.5h8.5V21H3zm9.5 0H21V21h-8.5z" />
        </svg>
      );
    case 'MACOS':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path
            fill="#111827"
            d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
          />
        </svg>
      );
    case 'LINUX':
      // Uproszczony Tux: czarne ciało, biały brzuch, oczy, pomarańczowy dziób i stopy.
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <ellipse cx="12" cy="13.2" rx="7" ry="9" fill="#111827" />
          <ellipse cx="12" cy="16.2" rx="4.6" ry="5.8" fill="#F9FAFB" />
          <circle cx="10" cy="8" r="1.4" fill="#F9FAFB" />
          <circle cx="14" cy="8" r="1.4" fill="#F9FAFB" />
          <circle cx="10.35" cy="8.25" r="0.65" fill="#111827" />
          <circle cx="13.65" cy="8.25" r="0.65" fill="#111827" />
          <ellipse cx="12" cy="10.6" rx="1.9" ry="1.05" fill="#F59E0B" />
          <ellipse cx="8.4" cy="22" rx="2.7" ry="1.2" fill="#F59E0B" />
          <ellipse cx="15.6" cy="22" rx="2.7" ry="1.2" fill="#F59E0B" />
        </svg>
      );
    case 'CHROMEOS':
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="#DB4437" d="M12 12 3.34 7A10 10 0 0 1 20.66 7Z" />
          <path fill="#F4B400" d="M12 12 20.66 7A10 10 0 0 1 12 22Z" />
          <path fill="#0F9D58" d="M12 12 12 22A10 10 0 0 1 3.34 7Z" />
          <circle cx="12" cy="12" r="4.6" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="3.5" fill="#4285F4" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
  }
}

/** Logo systemu na jasnym kafelku + nazwa (i opcjonalnie wersja). W wierszu tabeli
 *  kafelek lekko się powiększa przy najechaniu (DataTable nadaje wierszom `group`). */
export function SystemBadge({ system, wersja }: { system: SystemOperacyjny | null; wersja?: string | null }) {
  if (!system) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  const nazwa = SYSTEM_OPERACYJNY_LABELS[system];
  return (
    <span className="inline-flex items-center gap-2" title={wersja ? `${nazwa} ${wersja}` : nazwa}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200 group-hover:scale-110 dark:bg-gray-100">
        <OsIcon system={system} className="h-4 w-4" />
      </span>
      <span className="whitespace-nowrap">{nazwa}</span>
      {wersja && <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">{wersja}</span>}
    </span>
  );
}

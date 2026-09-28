import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Ikona = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
      title={isDark ? 'Jasny motyw' : 'Ciemny motyw'}
      className="rounded-full p-2 text-gray-500 transition duration-200 hover:bg-gray-900/[0.05] hover:text-indigo-600 active:scale-90 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-amber-300"
    >
      {/* key = motyw: po przełączeniu ikona „wkręca się” na nowo. */}
      <Ikona key={theme} className="h-5 w-5 animate-spin-in" />
    </button>
  );
}

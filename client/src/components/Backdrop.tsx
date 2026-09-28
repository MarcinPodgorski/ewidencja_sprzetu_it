const MASKA_KROPEK = 'radial-gradient(ellipse 90% 75% at 50% 0%, black 25%, transparent 100%)';

/**
 * Dekoracyjne tło aplikacji: lekki gradient, siatka kropek wygaszana ku dołowi i trzy
 * rozmyte plamy koloru dryfujące bardzo powoli (animowany wyłącznie `transform`, więc
 * przeglądarka nie przelicza rozmycia w każdej klatce). Rodzic musi mieć `isolate`,
 * żeby `-z-10` trzymało tło pod treścią strony.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-slate-50 to-rose-50 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950" />
      <div className="absolute -left-40 -top-48 h-[36rem] w-[36rem] rounded-full bg-indigo-300/30 blur-3xl will-change-transform animate-aurora dark:bg-indigo-600/20" />
      <div className="absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-fuchsia-300/20 blur-3xl will-change-transform animate-aurora-slow dark:bg-violet-600/15" />
      <div className="absolute -bottom-48 left-1/3 h-[34rem] w-[34rem] rounded-full bg-amber-200/30 blur-3xl will-change-transform animate-aurora dark:bg-sky-700/10" />
      <div className="bg-dots absolute inset-0" style={{ maskImage: MASKA_KROPEK, WebkitMaskImage: MASKA_KROPEK }} />
    </div>
  );
}

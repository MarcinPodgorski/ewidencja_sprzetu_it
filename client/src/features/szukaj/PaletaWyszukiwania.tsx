import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CardSim,
  ClipboardList,
  CornerDownLeft,
  Droplets,
  Keyboard,
  Laptop,
  Loader2,
  Monitor,
  Mouse,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  Smartphone,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { TypWynikuSzukania } from 'shared';
import { useAuth } from '../../auth/AuthContext';
import { grupyDlaRoli } from '../../components/nawigacja';
import { doPorownania } from '../../lib/tekst';
import { useOpoznione } from '../../lib/useOpoznione';
import { MIN_DLUGOSC_ZAPYTANIA, useSzukaj, type WynikSzukania } from './szukaj.hooks';

/** Skrót pokazywany przy przycisku wyszukiwania — ⌘K na Macu, Ctrl K gdzie indziej. */
export const SKROT_SZUKANIA = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';

const TYPY: Record<TypWynikuSzukania, { grupa: string; ikona: LucideIcon; sciezka: (w: WynikSzukania) => string }> = {
  KOMPUTER: { grupa: 'Komputery', ikona: Laptop, sciezka: (w) => `/computers/${w.id}` },
  MONITOR: { grupa: 'Monitory', ikona: Monitor, sciezka: (w) => `/monitors/${w.id}` },
  MYSZ: { grupa: 'Myszy', ikona: Mouse, sciezka: (w) => `/mice/${w.id}` },
  KLAWIATURA: { grupa: 'Klawiatury', ikona: Keyboard, sciezka: (w) => `/keyboards/${w.id}` },
  TELEFON: { grupa: 'Telefony', ikona: Smartphone, sciezka: (w) => `/phones/${w.id}` },
  KARTA_SIM: { grupa: 'Karty SIM', ikona: CardSim, sciezka: (w) => `/sim-cards/${w.id}` },
  DRUKARKA: { grupa: 'Drukarki', ikona: Printer, sciezka: (w) => `/printers/${w.id}` },
  TONER: { grupa: 'Tonery/tusze', ikona: Droplets, sciezka: (w) => `/toners/${w.id}/edit` },
  PRACOWNIK: { grupa: 'Pracownicy', ikona: User, sciezka: (w) => `/employees/${w.id}` },
  ROZNE: { grupa: 'Różne (u pracowników)', ikona: Package, sciezka: (w) => `/employees/${w.pracownikId}` },
  FAKTURA: { grupa: 'Faktury', ikona: Receipt, sciezka: (w) => `/faktury/${w.id}` },
  SPIS: { grupa: 'Spisy sprzętu', ikona: ClipboardList, sciezka: (w) => `/equipment-lists/${w.id}` },
};

const NOWE: { label: string; to: string }[] = [
  { label: 'Nowy komputer', to: '/computers/new' },
  { label: 'Nowy monitor', to: '/monitors/new' },
  { label: 'Nowa mysz', to: '/mice/new' },
  { label: 'Nowa klawiatura', to: '/keyboards/new' },
  { label: 'Nowy telefon', to: '/phones/new' },
  { label: 'Nowa karta SIM', to: '/sim-cards/new' },
  { label: 'Nowa drukarka', to: '/printers/new' },
  { label: 'Nowy toner/tusz', to: '/toners/new' },
  { label: 'Nowy pracownik', to: '/employees/new' },
  { label: 'Nowa faktura', to: '/faktury/new' },
];

interface Pozycja {
  klucz: string;
  ikona: LucideIcon;
  tytul: string;
  podtytul?: string | null;
  dopasowanie?: string | null;
  odznaka?: string;
  sciezka: string;
}

interface Grupa {
  nazwa: string;
  pozycje: Pozycja[];
  /** Trafienia, które nie zmieściły się w grupie (serwer zwraca kilka najlepszych). */
  pozostale: number;
}

function pasuje(tekst: string, slowa: string[]): boolean {
  const t = doPorownania(tekst);
  return slowa.every((s) => t.includes(s));
}

function odznaka(w: WynikSzukania): string | undefined {
  if (!w.nieaktywny) return undefined;
  if (w.typ === 'PRACOWNIK') return 'nieaktywny';
  if (w.typ === 'ROZNE') return 'pracownik nieaktywny';
  return 'wycofany';
}

export function PaletaWyszukiwania({ otwarta, onZamknij }: { otwarta: boolean; onZamknij: () => void }) {
  // Osobny komponent: każde otwarcie zaczyna od pustego pola i pierwszej pozycji.
  return otwarta ? <Paleta onZamknij={onZamknij} /> : null;
}

function Paleta({ onZamknij }: { onZamknij: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [aktywnyKlucz, setAktywnyKlucz] = useState<string | null>(null);
  // Element z fokusem sprzed otwarcia — odczytany w pierwszym renderze, zanim autoFocus go zmieni.
  const [poprzedniFokus] = useState(() => document.activeElement as HTMLElement | null);

  const zapytanie = useOpoznione(q.trim(), 150);
  const { data, isFetching } = useSzukaj(zapytanie);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (poprzedniFokus?.isConnected) poprzedniFokus.focus();
    };
  }, [poprzedniFokus]);

  const fraza = doPorownania(q);
  const slowa = fraza.split(' ').filter(Boolean);
  const szukaNaSerwerze = fraza.length >= MIN_DLUGOSC_ZAPYTANIA;

  const strony: Pozycja[] = grupyDlaRoli(user?.rola)
    .flatMap((g) => g.items)
    .filter((item) => pasuje(`${item.label} ${item.slowa ?? ''}`, slowa))
    .map((item) => ({ klucz: `strona:${item.to}`, ikona: item.icon, tytul: item.label, sciezka: item.to }));
  const akcje: Pozycja[] = fraza
    ? NOWE.filter((a) => pasuje(`${a.label} dodaj utwórz`, slowa)).map((a) => ({
        klucz: `akcja:${a.to}`,
        ikona: Plus,
        tytul: a.label,
        sciezka: a.to,
      }))
    : [];

  const grupyWynikow: Grupa[] = [];
  if (szukaNaSerwerze && data) {
    for (const w of data.wyniki) {
      const typ = TYPY[w.typ];
      let grupa = grupyWynikow.find((g) => g.nazwa === typ.grupa);
      if (!grupa) {
        grupa = { nazwa: typ.grupa, pozycje: [], pozostale: data.lacznie[w.typ] ?? 0 };
        grupyWynikow.push(grupa);
      }
      grupa.pozostale -= 1;
      grupa.pozycje.push({
        klucz: `${w.typ}:${w.id}`,
        ikona: typ.ikona,
        tytul: w.tytul,
        podtytul: w.podtytul,
        dopasowanie: w.dopasowanie,
        odznaka: odznaka(w),
        sciezka: typ.sciezka(w),
      });
    }
  }

  // Strona, której nazwa zaczyna się od wpisanego tekstu („kop” → Kopie zapasowe), idzie na górę.
  const stronyNajpierw = fraza !== '' && strony.some((s) => doPorownania(s.tytul).startsWith(fraza));
  const grupaStron: Grupa = { nazwa: 'Przejdź do', pozycje: strony, pozostale: 0 };
  const grupy = [
    ...(stronyNajpierw ? [grupaStron] : []),
    ...grupyWynikow,
    ...(stronyNajpierw ? [] : [grupaStron]),
    { nazwa: 'Utwórz', pozycje: akcje, pozostale: 0 },
  ].filter((g) => g.pozycje.length > 0);

  const plaska = grupy.flatMap((g) => g.pozycje);
  const indeksy = new Map(plaska.map((p, i) => [p.klucz, i]));
  const aktywny = Math.max(0, aktywnyKlucz ? (indeksy.get(aktywnyKlucz) ?? 0) : 0);
  const laduje = szukaNaSerwerze && (isFetching || zapytanie !== q.trim());

  useEffect(() => {
    document.getElementById(`paleta-poz-${aktywny}`)?.scrollIntoView({ block: 'nearest' });
  }, [aktywny]);

  function otworz(p: Pozycja) {
    onZamknij();
    navigate(p.sciezka);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (plaska.length === 0) return;
      const krok = e.key === 'ArrowDown' ? 1 : -1;
      setAktywnyKlucz(plaska[(aktywny + krok + plaska.length) % plaska.length].klucz);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = plaska[aktywny];
      if (p) otworz(p);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onZamknij();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // fokus zostaje w palecie
    }
  }

  let komunikat: string | null = null;
  if (plaska.length === 0) {
    if (!szukaNaSerwerze) komunikat = 'Wpisz co najmniej 2 znaki.';
    else if (!laduje) komunikat = `Nic nie znaleziono dla „${q.trim()}”.`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-gray-950/40 px-3 pt-3 backdrop-blur-sm animate-fade-in sm:px-4 sm:pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onZamknij();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wyszukiwarka"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 animate-modal-in dark:bg-gray-900 dark:ring-white/10 sm:max-h-[70vh]"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-white/10">
          <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAktywnyKlucz(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Szukaj sprzętu, pracowników, faktur…"
            className="h-14 w-full min-w-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
            role="combobox"
            aria-label="Szukana fraza"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-autocomplete="list"
            aria-activedescendant={plaska.length > 0 ? `paleta-poz-${aktywny}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {laduje && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" aria-label="Szukam…" />}
          <kbd className="hidden shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onZamknij}
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200 sm:hidden"
            aria-label="Zamknij wyszukiwarkę"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="paleta-lista" role="listbox" aria-label="Wyniki" className="flex-1 overflow-y-auto overscroll-contain py-2">
          {fraza === '' && (
            <p className="px-4 pb-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
              Numer ewidencyjny lub seryjny, model, MAC, IMEI, numer telefonu, nazwisko, numer faktury — z&nbsp;polskimi
              znakami albo bez.
            </p>
          )}
          {grupy.map((g) => (
            <div key={g.nazwa} role="group" aria-label={g.nazwa}>
              <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {g.nazwa}
              </div>
              {g.pozycje.map((p) => {
                const i = indeksy.get(p.klucz)!;
                const zaznaczona = i === aktywny;
                return (
                  <div
                    key={p.klucz}
                    id={`paleta-poz-${i}`}
                    role="option"
                    aria-selected={zaznaczona}
                    onMouseMove={() => {
                      if (!zaznaczona) setAktywnyKlucz(p.klucz);
                    }}
                    onClick={() => otworz(p)}
                    className={`mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-100 ${
                      zaznaczona ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        zaznaczona
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                      }`}
                    >
                      <p.ikona className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.tytul}</span>
                        {p.odznaka && (
                          <span className="badge shrink-0 bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400">
                            {p.odznaka}
                          </span>
                        )}
                      </span>
                      {p.podtytul && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{p.podtytul}</span>
                      )}
                      {p.dopasowanie && (
                        <span className="block truncate text-xs text-indigo-600 dark:text-indigo-300">{p.dopasowanie}</span>
                      )}
                    </span>
                    {zaznaczona && <CornerDownLeft className="hidden h-4 w-4 shrink-0 text-indigo-400 sm:block" />}
                  </div>
                );
              })}
              {g.pozostale > 0 && (
                <p className="px-4 pb-1 pt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  …i jeszcze {g.pozostale} — doprecyzuj wyszukiwanie
                </p>
              )}
            </div>
          ))}
          {komunikat && <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{komunikat}</p>}
        </div>

        <div className="hidden items-center gap-4 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500 sm:flex">
          <span>↑ ↓ wybór</span>
          <span>↵ otwórz</span>
          <span>Esc zamknij</span>
        </div>
      </div>
    </div>
  );
}

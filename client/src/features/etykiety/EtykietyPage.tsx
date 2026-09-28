import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EQUIPMENT_TYPE_LABELS,
  SZABLON_ETYKIET_INFO,
  SZABLONY_ETYKIET,
  TYPY_Z_ETYKIETA,
  type SzablonEtykiet,
  type TypZEtykieta,
} from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ApiError, downloadFile } from '../../lib/api';
import { odmiana } from '../../lib/odmiana';
import { departmentsApi } from '../entities';
import { useSprzetDoEtykiet } from './etykiety.hooks';

const KLUCZ_SZABLONU = 'etykiety.szablon';

/** Adres aplikacji, pod który prowadzą kody QR — ten sam, pod którym jest otwarta teraz. */
function adresAplikacji(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
}

function zapamietanySzablon(): SzablonEtykiet {
  try {
    const zapisany = localStorage.getItem(KLUCZ_SZABLONU);
    if (zapisany && (SZABLONY_ETYKIET as readonly string[]).includes(zapisany)) return zapisany as SzablonEtykiet;
  } catch {
    // brak dostępu do localStorage (tryb prywatny) — zostaje domyślny
  }
  return 'A4_70x37';
}

const klucz = (s: { sprzetTyp: string; sprzetId: number }) => `${s.sprzetTyp}:${s.sprzetId}`;

export function EtykietyPage() {
  const [parametry] = useSearchParams();
  const typZAdresu = parametry.get('typ');
  const [typ, setTyp] = useState<TypZEtykieta | ''>(
    typZAdresu && (TYPY_Z_ETYKIETA as readonly string[]).includes(typZAdresu) ? (typZAdresu as TypZEtykieta) : '',
  );
  const [dzialId, setDzialId] = useState('');
  const [szukaj, setSzukaj] = useState(parametry.get('szukaj') ?? '');
  const [odznaczone, setOdznaczone] = useState<Set<string>>(new Set());
  const [szablon, setSzablon] = useState<SzablonEtykiet>(zapamietanySzablon);
  const [pierwsza, setPierwsza] = useState(1);
  const [generowanie, setGenerowanie] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);

  const { data: dzialy } = departmentsApi.useList();
  const { data: sprzet, isLoading } = useSprzetDoEtykiet({ typ: typ || undefined, dzialId: dzialId ? Number(dzialId) : undefined });

  const widoczne = useMemo(() => {
    const fraza = szukaj.trim().toLowerCase();
    if (!fraza) return sprzet ?? [];
    return (sprzet ?? []).filter((s) =>
      [s.identyfikator, s.opis, s.uzytkownik, s.numerSeryjny].some((pole) => pole?.toLowerCase().includes(fraza)),
    );
  }, [sprzet, szukaj]);
  const wybrane = widoczne.filter((s) => !odznaczone.has(klucz(s)));
  const info = SZABLON_ETYKIET_INFO[szablon];
  const naArkuszu = info.kolumny * info.wiersze;
  const adres = adresAplikacji();
  const lokalnyAdres = /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(adres);

  function przelacz(k: string) {
    const nowe = new Set(odznaczone);
    if (nowe.has(k)) nowe.delete(k);
    else nowe.add(k);
    setOdznaczone(nowe);
  }

  function zmienSzablon(nowy: SzablonEtykiet) {
    setSzablon(nowy);
    setPierwsza(1);
    try {
      localStorage.setItem(KLUCZ_SZABLONU, nowy);
    } catch {
      // bez zapamiętywania — nic się nie stanie
    }
  }

  async function generuj() {
    setBlad(null);
    setGenerowanie(true);
    try {
      await downloadFile(
        '/etykiety/pdf',
        {
          pozycje: wybrane.map((s) => ({ sprzetTyp: s.sprzetTyp, sprzetId: s.sprzetId })),
          szablon,
          pierwszaEtykieta: info.arkuszA4 ? pierwsza : 1,
          adresAplikacji: adres,
        },
        `etykiety-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch (err) {
      setBlad(err instanceof ApiError ? err.message : 'Nie udało się wygenerować etykiet');
    } finally {
      setGenerowanie(false);
    }
  }

  const wszystkieZaznaczone = widoczne.length > 0 && wybrane.length === widoczne.length;

  return (
    <div>
      <PageHeader
        title="Etykiety QR"
        subtitle="Naklejki z kodem prowadzącym do karty sprzętu — skan telefonem otwiera kartę albo potwierdza sprzęt w spisie z natury"
      />

      {lokalnyAdres && (
        <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Aplikacja jest otwarta pod adresem <strong>{adres}</strong> — kody QR prowadziłyby do niego, a telefon go nie otworzy.
          Otwórz aplikację pod adresem serwera w sieci (np. http://192.168.1.10/sprzet) i wygeneruj etykiety stamtąd.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              className="input max-w-xs"
              placeholder="Szukaj numeru, modelu, osoby…"
              value={szukaj}
              onChange={(e) => {
                setSzukaj(e.target.value);
                setOdznaczone(new Set());
              }}
            />
            <select
              className="input max-w-[12rem]"
              value={typ}
              onChange={(e) => {
                setTyp(e.target.value as TypZEtykieta | '');
                setOdznaczone(new Set());
              }}
            >
              <option value="">Wszystkie typy</option>
              {TYPY_Z_ETYKIETA.map((t) => (
                <option key={t} value={t}>
                  {EQUIPMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              className="input max-w-[12rem]"
              value={dzialId}
              onChange={(e) => {
                setDzialId(e.target.value);
                setOdznaczone(new Set());
              }}
            >
              <option value="">Wszystkie działy</option>
              {dzialy?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nazwa}
                </option>
              ))}
            </select>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                      checked={wszystkieZaznaczone}
                      onChange={() => setOdznaczone(wszystkieZaznaczone ? new Set(widoczne.map(klucz)) : new Set())}
                      aria-label="Zaznacz wszystko"
                    />
                  </th>
                  <th>Nr ewidencyjny</th>
                  <th>Typ</th>
                  <th>Marka/model</th>
                  <th>Użytkownik / lokalizacja</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400">
                      Ładowanie…
                    </td>
                  </tr>
                ) : widoczne.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400">
                      Brak sprzętu dla tych filtrów.
                    </td>
                  </tr>
                ) : (
                  widoczne.map((s) => (
                    <tr key={klucz(s)} className="cursor-pointer" onClick={() => przelacz(klucz(s))}>
                      <td>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                          checked={!odznaczone.has(klucz(s))}
                          onChange={() => przelacz(klucz(s))}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Etykieta: ${s.identyfikator}`}
                        />
                      </td>
                      <td className="font-medium">{s.identyfikator}</td>
                      <td>{EQUIPMENT_TYPE_LABELS[s.sprzetTyp]}</td>
                      <td>{s.opis ?? '—'}</td>
                      <td className="text-gray-500 dark:text-gray-400">{s.uzytkownik ?? 'nieprzypisany'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit space-y-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Wydruk</h2>
          <div>
            <label className="label" htmlFor="szablon">
              Format naklejek
            </label>
            <select id="szablon" className="input" value={szablon} onChange={(e) => zmienSzablon(e.target.value as SzablonEtykiet)}>
              {SZABLONY_ETYKIET.map((s) => (
                <option key={s} value={s}>
                  {SZABLON_ETYKIET_INFO[s].nazwa}
                </option>
              ))}
            </select>
          </div>
          {info.arkuszA4 && (
            <div>
              <label className="label" htmlFor="pierwsza">
                Zacznij od etykiety nr
              </label>
              <input
                id="pierwsza"
                type="number"
                min={1}
                max={naArkuszu}
                className="input w-28"
                value={pierwsza}
                onChange={(e) => setPierwsza(Math.min(naArkuszu, Math.max(1, Number(e.target.value) || 1)))}
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Żeby dokończyć napoczęty arkusz — liczone od lewej, wierszami (1–{naArkuszu}).
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kody prowadzą do <span className="font-mono">{adres}/q/&lt;numer&gt;</span>. Telefon musi być w sieci firmy i zalogowany
            do aplikacji. Drukuj w skali 100% (bez „dopasuj do strony”).
          </p>
          {blad && <p className="field-error">{blad}</p>}
          <button type="button" className="btn-primary w-full" disabled={wybrane.length === 0 || generowanie} onClick={generuj}>
            {generowanie
              ? 'Generowanie…'
              : `Pobierz PDF (${wybrane.length} ${odmiana(wybrane.length, ['etykieta', 'etykiety', 'etykiet'])})`}
          </button>
        </div>
      </div>
    </div>
  );
}

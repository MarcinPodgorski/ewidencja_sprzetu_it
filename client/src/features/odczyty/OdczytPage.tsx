import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  COMPUTER_TYPE_LABELS,
  COMPUTER_TYPES,
  DOPASOWANIE_ODCZYTU_LABELS,
  POLA_ODCZYTU,
  POLE_ODCZYTU_LABELS,
  RAM_TYPES,
  SYSTEM_OPERACYJNY_LABELS,
  SYSTEMY_OPERACYJNE,
  TYPY_PAMIECI_SMBIOS,
  ZRODLO_ODCZYTU_LABELS,
  odczytUtworzKomputerSchema,
  odczytZastosujSchema,
  rozmiarDysku,
  type DaneOdczytu,
  type PoleOdczytu,
} from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../lib/api';
import { odmiana } from '../../lib/odmiana';
import type { OdczytSzczegoly } from '../../types/entities';
import { computersApi } from '../entities';
import { formatujDate } from '../onboarding/utils';
import {
  useDopasujOdczyt,
  useOdczyt,
  useOdrzucOdczyt,
  useUtworzKomputerZOdczytu,
  useZastosujOdczyt,
} from './odczyty.hooks';
import {
  BITLOCKER_LABELS,
  ENTRA_LABELS,
  MAGISTRALE_DYSKOW,
  StatusOdczytuBadge,
  opisWartosci,
  takieSame,
} from './utils';

type Wartosci = Record<PoleOdczytu, string>;
type Bledy = Partial<Record<PoleOdczytu | 'numerEwidencyjny' | 'ogolny', string>>;

/** Pola wymagane przy tworzeniu komputera (reszta może zostać pusta). */
const WYMAGANE: ReadonlySet<PoleOdczytu> = new Set([
  'markaModel',
  'numerSeryjny',
  'typ',
  'cpu',
  'ramIloscGb',
  'ramRodzaj',
  'pojemnoscDysku',
]);

/** Domyślne nazwy Windowsa (DESKTOP-7Q2M4KD) nie nadają się na numer ewidencyjny. */
const NAZWA_DOMYSLNA = /^(DESKTOP|LAPTOP|WIN|PC)-[A-Z0-9]{4,}$/i;

function wartosciZPropozycji(odczyt: OdczytSzczegoly): Wartosci {
  return Object.fromEntries(
    POLA_ODCZYTU.map((pole) => [pole, odczyt.propozycja[pole] === undefined ? '' : String(odczyt.propozycja[pole])]),
  ) as Wartosci;
}

/** Wartość z pola formularza → API (RAM jako liczba; puste teksty rozstrzyga walidacja wspólna z serwerem). */
function doApi(pole: PoleOdczytu, wartosc: string): unknown {
  return pole === 'ramIloscGb' ? Number(wartosc) : wartosc.trim();
}

/** Błędy Zoda → komunikaty przy konkretnych polach (ścieżka: ['pola'|'komputer', nazwaPola]). */
function bledyPol(issues: { path: (string | number)[]; message: string }[]): Bledy {
  const wynik: Bledy = {};
  for (const issue of issues) {
    const pole = (issue.path[1] ?? 'ogolny') as keyof Bledy;
    wynik[pole] ??= issue.message;
  }
  return wynik;
}

function PoleEdycji({ pole, wartosc, onChange }: { pole: PoleOdczytu; wartosc: string; onChange: (v: string) => void }) {
  const wspolne = { className: 'input py-1.5', value: wartosc, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  if (pole === 'typ') {
    return (
      <select {...wspolne}>
        <option value="">—</option>
        {COMPUTER_TYPES.map((t) => (
          <option key={t} value={t}>
            {COMPUTER_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
    );
  }
  if (pole === 'ramRodzaj') {
    return (
      <select {...wspolne}>
        <option value="">—</option>
        {RAM_TYPES.map((t) => (
          <option key={t} value={t}>
            {t === 'INNY' ? 'Inny' : t}
          </option>
        ))}
      </select>
    );
  }
  if (pole === 'systemOperacyjny') {
    return (
      <select {...wspolne}>
        <option value="">—</option>
        {SYSTEMY_OPERACYJNE.map((s) => (
          <option key={s} value={s}>
            {SYSTEM_OPERACYJNY_LABELS[s]}
          </option>
        ))}
      </select>
    );
  }
  return <input {...wspolne} type={pole === 'ramIloscGb' ? 'number' : 'text'} min={pole === 'ramIloscGb' ? 1 : undefined} />;
}

function Uwagi({ uwaga, blad }: { uwaga?: string; blad?: string }) {
  return (
    <>
      {uwaga && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{uwaga}</p>}
      {blad && <p className="field-error">{blad}</p>}
    </>
  );
}

/** Odczyt dopasowany do komputera: porównanie i przepisanie wybranych pól. */
function FormularzZastosowania({ odczyt }: { odczyt: OdczytSzczegoly & { komputer: NonNullable<OdczytSzczegoly['komputer']> } }) {
  const komputer = odczyt.komputer;
  const zastosuj = useZastosujOdczyt();
  const [wartosci, setWartosci] = useState<Wartosci>(() => wartosciZPropozycji(odczyt));
  // Domyślnie zaznaczone tylko faktyczne różnice — reszta „się zgadza”.
  const [zaznaczone, setZaznaczone] = useState<Set<PoleOdczytu>>(
    () => new Set(POLA_ODCZYTU.filter((p) => odczyt.propozycja[p] !== undefined && !takieSame(komputer[p], odczyt.propozycja[p]))),
  );
  const [bledy, setBledy] = useState<Bledy>({});

  function przelacz(pole: PoleOdczytu) {
    const nowe = new Set(zaznaczone);
    if (nowe.has(pole)) nowe.delete(pole);
    else nowe.add(pole);
    setZaznaczone(nowe);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const pola = Object.fromEntries([...zaznaczone].map((p) => [p, doApi(p, wartosci[p])]));
    const wynik = odczytZastosujSchema.safeParse({ pola });
    if (!wynik.success) {
      setBledy(bledyPol(wynik.error.issues));
      return;
    }
    setBledy({});
    try {
      await zastosuj.mutateAsync({ id: odczyt.id, pola });
    } catch (err) {
      setBledy({ ogolny: err instanceof ApiError ? err.message : 'Nie udało się zapisać zmian' });
    }
  }

  const liczbaZmian = zaznaczone.size;
  const liczbaRoznic = POLA_ODCZYTU.filter(
    (p) => odczyt.propozycja[p] !== undefined && !takieSame(komputer[p], odczyt.propozycja[p]),
  ).length;

  return (
    <form onSubmit={onSubmit} className="card mb-6 p-0">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/60">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Zmiany do zapisania w ewidencji</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Zaznaczone są pola, które różnią się od ewidencji. Wartość z odczytu możesz poprawić przed zapisaniem.
          Różnica, której nie zapiszesz, zostanie zapamiętana — kolejne odczyty cykliczne zgłoszą ją dopiero, gdy
          komputer poda w tym polu coś innego.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-10" />
              <th>Pole</th>
              <th>W ewidencji ({komputer.numerEwidencyjny})</th>
              <th className="min-w-[16rem]">Z odczytu</th>
            </tr>
          </thead>
          <tbody>
            {POLA_ODCZYTU.map((pole) => {
              const maPropozycje = odczyt.propozycja[pole] !== undefined;
              const zaznaczony = zaznaczone.has(pole);
              return (
                <tr key={pole} className={maPropozycje ? '' : 'opacity-60'}>
                  <td>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                      checked={zaznaczony}
                      disabled={!maPropozycje}
                      onChange={() => przelacz(pole)}
                      aria-label={`Zapisz: ${POLE_ODCZYTU_LABELS[pole]}`}
                    />
                  </td>
                  <td className="whitespace-nowrap font-medium">{POLE_ODCZYTU_LABELS[pole]}</td>
                  <td className={zaznaczony ? 'text-gray-400 line-through dark:text-gray-500' : ''}>
                    {opisWartosci(pole, komputer[pole])}
                  </td>
                  <td>
                    {maPropozycje ? (
                      <PoleEdycji pole={pole} wartosc={wartosci[pole]} onChange={(v) => setWartosci({ ...wartosci, [pole]: v })} />
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">nie odczytano</span>
                    )}
                    <Uwagi uwaga={odczyt.uwagi[pole]} blad={bledy[pole]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700/60">
        {bledy.ogolny && <p className="field-error mr-auto mt-0">{bledy.ogolny}</p>}
        <button type="submit" className="btn-primary" disabled={zastosuj.isPending}>
          {zastosuj.isPending
            ? 'Zapisywanie…'
            : liczbaZmian > 0
              ? `Zapisz w ewidencji (${liczbaZmian} ${odmiana(liczbaZmian, ['pole', 'pola', 'pól'])})`
              : liczbaRoznic > 0
                ? 'Zostaw ewidencję bez zmian'
                : 'Wszystko się zgadza — oznacz jako przejrzany'}
        </button>
      </div>
    </form>
  );
}

/** Odczyt komputera, którego nie ma w ewidencji: nowy komputer z danymi z odczytu. */
function FormularzNowegoKomputera({ odczyt }: { odczyt: OdczytSzczegoly }) {
  const navigate = useNavigate();
  const utworz = useUtworzKomputerZOdczytu();
  const [numer, setNumer] = useState(() =>
    odczyt.hostname && !NAZWA_DOMYSLNA.test(odczyt.hostname) ? odczyt.hostname : '',
  );
  const [wartosci, setWartosci] = useState<Wartosci>(() => wartosciZPropozycji(odczyt));
  const [bledy, setBledy] = useState<Bledy>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const komputer = {
      numerEwidencyjny: numer.trim(),
      ...Object.fromEntries(POLA_ODCZYTU.map((p) => [p, doApi(p, wartosci[p])])),
    };
    const wynik = odczytUtworzKomputerSchema.safeParse({ komputer });
    if (!wynik.success) {
      setBledy(bledyPol(wynik.error.issues));
      return;
    }
    setBledy({});
    try {
      const nowy = await utworz.mutateAsync({ id: odczyt.id, komputer });
      navigate(`/computers/${nowy.id}`);
    } catch (err) {
      setBledy({ ogolny: err instanceof ApiError ? err.message : 'Nie udało się utworzyć komputera' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mb-6 p-0">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700/60">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nowy komputer z tego odczytu</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Nadaj numer ewidencyjny i sprawdź dane. Pola z gwiazdką są wymagane.
        </p>
      </div>
      <div className="px-5 pt-4">
        <label className="label" htmlFor="numer-ewidencyjny">
          Numer ewidencyjny <span className="text-red-500">*</span>
        </label>
        <input
          id="numer-ewidencyjny"
          className="input max-w-xs font-mono"
          value={numer}
          onChange={(e) => setNumer(e.target.value)}
          placeholder="np. KOMP-005"
        />
        {bledy.numerEwidencyjny && <p className="field-error">{bledy.numerEwidencyjny}</p>}
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Pole</th>
              <th className="min-w-[16rem]">Wartość</th>
            </tr>
          </thead>
          <tbody>
            {POLA_ODCZYTU.map((pole) => (
              <tr key={pole}>
                <td className="whitespace-nowrap font-medium">
                  {POLE_ODCZYTU_LABELS[pole]}
                  {WYMAGANE.has(pole) && <span className="text-red-500"> *</span>}
                </td>
                <td>
                  <PoleEdycji pole={pole} wartosc={wartosci[pole]} onChange={(v) => setWartosci({ ...wartosci, [pole]: v })} />
                  <Uwagi
                    uwaga={odczyt.propozycja[pole] === undefined ? 'nie odczytano — uzupełnij ręcznie' : odczyt.uwagi[pole]}
                    blad={bledy[pole]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700/60">
        {bledy.ogolny && <p className="field-error mr-auto mt-0">{bledy.ogolny}</p>}
        <button type="submit" className="btn-primary" disabled={utworz.isPending}>
          {utworz.isPending ? 'Tworzenie…' : 'Utwórz komputer'}
        </button>
      </div>
    </form>
  );
}

/** Powiązanie z komputerem w ewidencji (albo jego brak) + ręczna zmiana dopasowania. */
function Dopasowanie({ odczyt }: { odczyt: OdczytSzczegoly }) {
  const dopasuj = useDopasujOdczyt();
  const [zmiana, setZmiana] = useState(false);
  const { data: komputery } = computersApi.useList({ wycofany: false });
  const edycja = odczyt.status === 'NOWY' && (zmiana || !odczyt.computer);

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
      {odczyt.computer ? (
        <div className="flex-1">
          <span className="text-gray-500 dark:text-gray-400">Komputer w ewidencji: </span>
          <Link to={`/computers/${odczyt.computer.id}`} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            {odczyt.computer.numerEwidencyjny} — {odczyt.computer.markaModel}
          </Link>
          {odczyt.dopasowanie && (
            <span className="text-gray-500 dark:text-gray-400"> · rozpoznany: {DOPASOWANIE_ODCZYTU_LABELS[odczyt.dopasowanie]}</span>
          )}
        </div>
      ) : (
        <div className="flex-1 text-gray-700 dark:text-gray-300">
          Tego komputera <strong>nie ma w ewidencji</strong> (nie pasuje numer seryjny, nazwa ani adres MAC). Utwórz go poniżej
          albo powiąż z istniejącym, jeśli np. numer seryjny był wpisany z błędem.
        </div>
      )}
      {edycja ? (
        <select
          className="input w-auto min-w-[16rem]"
          value=""
          disabled={dopasuj.isPending}
          onChange={(e) => {
            if (e.target.value) {
              dopasuj.mutate({ id: odczyt.id, computerId: Number(e.target.value) }, { onSuccess: () => setZmiana(false) });
            }
          }}
        >
          <option value="">Powiąż z komputerem z ewidencji…</option>
          {komputery?.map((k) => (
            <option key={k.id} value={k.id}>
              {k.numerEwidencyjny} — {k.markaModel}
            </option>
          ))}
        </select>
      ) : (
        odczyt.status === 'NOWY' && (
          <button type="button" className="btn-secondary" onClick={() => setZmiana(true)}>
            Zmień komputer
          </button>
        )
      )}
    </div>
  );
}

function Wiersz({ etykieta, children }: { etykieta: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-gray-500 dark:text-gray-400">{etykieta}</dt>
      <dd className="text-gray-900 dark:text-gray-100">{children}</dd>
    </>
  );
}

function Lista({ tytul, pusta, children }: { tytul: string; pusta: boolean; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{tytul}</h3>
      {pusta ? <p className="text-gray-400 dark:text-gray-500">nie odczytano</p> : <ul className="space-y-1.5">{children}</ul>}
    </div>
  );
}

/** Wszystko, co skrypt zebrał — także informacje spoza pól ewidencji (BitLocker, Entra ID…). */
function SzczegolyOdczytu({ dane }: { dane: DaneOdczytu }) {
  const bitlocker = dane.bitlocker ? BITLOCKER_LABELS[dane.bitlocker] : undefined;
  const plyta = [dane.plytaProducent, dane.plytaModel].filter(Boolean).join(' ');
  return (
    <div className="card">
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Dane odczytane z komputera</h2>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Wiersz etykieta="Nazwa komputera">{dane.hostname ?? '—'}</Wiersz>
          <Wiersz etykieta="Zalogowany użytkownik">{dane.zalogowanyUzytkownik ?? '—'}</Wiersz>
          <Wiersz etykieta="Producent i model">
            {[dane.producent, dane.model, dane.modelWersja].filter(Boolean).join(' · ') || '—'}
          </Wiersz>
          {plyta && <Wiersz etykieta="Płyta główna">{plyta}</Wiersz>}
          <Wiersz etykieta="BIOS">
            {dane.bios ? [dane.bios.wersja, dane.bios.data && `z ${dane.bios.data}`].filter(Boolean).join(' ') || '—' : '—'}
          </Wiersz>
          <Wiersz etykieta="System">
            {dane.system
              ? [dane.system.nazwa, dane.system.wersja, dane.system.kompilacja && `kompilacja ${dane.system.kompilacja}`]
                  .filter(Boolean)
                  .join(', ') || '—'
              : '—'}
          </Wiersz>
          <Wiersz etykieta="Microsoft Entra ID">{dane.entraId ? (ENTRA_LABELS[dane.entraId] ?? dane.entraId) : '—'}</Wiersz>
          <Wiersz etykieta="BitLocker (dysk systemowy)">
            <span className={bitlocker?.klasa}>{bitlocker?.tekst ?? dane.bitlocker ?? 'nie odczytano'}</span>
          </Wiersz>
        </dl>
        <div className="space-y-4 text-sm">
          <Lista tytul="Karty sieciowe" pusta={dane.karty.length === 0}>
            {dane.karty.map((k, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2">
                <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{k.mac ?? '—'}</span>
                <span className="text-gray-600 dark:text-gray-300">{k.opis ?? k.nazwa}</span>
                <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {k.rodzaj === 'WIFI' ? 'Wi-Fi' : k.rodzaj === 'ETHERNET' ? 'Ethernet' : 'inna'}
                </span>
                {k.usb && <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">USB</span>}
              </li>
            ))}
          </Lista>
          <Lista tytul="Dyski" pusta={dane.dyski.length === 0}>
            {dane.dyski.map((d, i) => (
              <li key={i} className="text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-gray-100">{d.rozmiar ? rozmiarDysku(d.rozmiar) : '?'}</span>{' '}
                {d.typNosnika === 4 ? 'SSD' : d.typNosnika === 3 ? 'HDD' : ''} {d.nazwa}
                {d.magistrala !== null && MAGISTRALE_DYSKOW[d.magistrala] && (
                  <span className="text-gray-400 dark:text-gray-500"> · {MAGISTRALE_DYSKOW[d.magistrala]}</span>
                )}
              </li>
            ))}
          </Lista>
          <Lista tytul="Pamięć" pusta={dane.pamiec.length === 0}>
            {dane.pamiec.map((m, i) => (
              <li key={i} className="text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {m.pojemnosc ? `${Math.round(m.pojemnosc / 1024 ** 3)} GB` : '?'}
                </span>{' '}
                {(m.typSmbios !== null && TYPY_PAMIECI_SMBIOS[m.typSmbios]?.etykieta) || ''}
                {m.predkosc ? ` · ${m.predkosc} MHz` : ''}
              </li>
            ))}
          </Lista>
        </div>
      </div>
      {dane.bledy.length > 0 && (
        <div className="mt-5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Nie wszystko udało się odczytać:
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {dane.bledy.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Przejrzany odczyt — tylko podgląd tego, co przyszło z komputera. */
function PodgladOdczytu({ odczyt }: { odczyt: OdczytSzczegoly }) {
  return (
    <div className="card mb-6 overflow-x-auto p-0">
      <table className="table-base">
        <thead>
          <tr>
            <th>Pole</th>
            <th>Z odczytu</th>
            {odczyt.komputer && <th>W ewidencji teraz</th>}
          </tr>
        </thead>
        <tbody>
          {POLA_ODCZYTU.map((pole) => (
            <tr key={pole}>
              <td className="whitespace-nowrap font-medium">{POLE_ODCZYTU_LABELS[pole]}</td>
              <td>
                {opisWartosci(pole, odczyt.propozycja[pole])}
                {odczyt.pominietePola.includes(pole) && (
                  <span
                    className="badge ml-2 bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
                    title="Przy rozpatrzeniu ewidencja została celowo inna niż odczyt — ta różnica nie jest zgłaszana ponownie"
                  >
                    pominięte
                  </span>
                )}
              </td>
              {odczyt.komputer && <td>{opisWartosci(pole, odczyt.komputer[pole])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OdczytPage() {
  const { id } = useParams();
  const { data: odczyt, isLoading, isError } = useOdczyt(Number(id));
  const odrzuc = useOdrzucOdczyt();

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  if (isError || !odczyt) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono tego odczytu.</div>;
  }

  const nowy = odczyt.status === 'NOWY';

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={odczyt.hostname ?? `Odczyt #${odczyt.id}`}
        subtitle={[odczyt.markaModel, `otrzymano ${formatujDate(odczyt.otrzymanoAt)}`, ZRODLO_ODCZYTU_LABELS[odczyt.zrodlo]]
          .filter(Boolean)
          .join(' · ')}
        backTo="/odczyty"
        actions={
          nowy && (
            <button type="button" className="btn-secondary" disabled={odrzuc.isPending} onClick={() => odrzuc.mutate(odczyt.id)}>
              Odrzuć odczyt
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <StatusOdczytuBadge odczyt={odczyt} />
        {odczyt.status === 'ZASTOSOWANY' && odczyt.rozpatrzonoAt && (
          <span>
            {formatujDate(odczyt.rozpatrzonoAt)}
            {odczyt.rozpatrzylAppUser && `, ${odczyt.rozpatrzylAppUser.login}`}
          </span>
        )}
        {odczyt.status === 'BEZ_ZMIAN' && (
          <span>Dane zgodne z ewidencją (poza różnicami pominiętymi wcześniej) — nie było czego przeglądać.</span>
        )}
        {odczyt.status === 'ODRZUCONY' && (
          <span>
            {odczyt.zastapiony
              ? 'Przyszedł nowszy odczyt tego komputera — przejrzyj go zamiast tego.'
              : `${odczyt.rozpatrzonoAt ? formatujDate(odczyt.rozpatrzonoAt) : ''}${odczyt.rozpatrzylAppUser ? `, ${odczyt.rozpatrzylAppUser.login}` : ''}`}
          </span>
        )}
      </div>

      <Dopasowanie odczyt={odczyt} />

      {nowy && odczyt.komputer ? (
        <FormularzZastosowania key={`${odczyt.id}-${odczyt.komputer.id}`} odczyt={{ ...odczyt, komputer: odczyt.komputer }} />
      ) : nowy ? (
        <FormularzNowegoKomputera odczyt={odczyt} />
      ) : (
        <PodgladOdczytu odczyt={odczyt} />
      )}

      <SzczegolyOdczytu dane={odczyt.dane} />
    </div>
  );
}

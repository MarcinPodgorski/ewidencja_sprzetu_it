import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  EQUIPMENT_API_SEGMENT,
  EQUIPMENT_TYPE_LABELS,
  SYSTEM_OPERACYJNY_LABELS,
  type SekcjaStanuFloty,
  type SystemOperacyjny,
} from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { SystemBadge } from '../../components/OsIcon';
import { ApiError, api } from '../../lib/api';
import { odmiana } from '../../lib/odmiana';
import { formatujDate } from '../onboarding/utils';

interface Komputer {
  id: number;
  numerEwidencyjny: string;
  markaModel: string;
  systemOperacyjny: SystemOperacyjny | null;
  wersjaSystemu: string | null;
  uzytkownik: string | null;
  dzial: string | null;
}

interface StanFloty {
  progi: { dniOdczytu: number; dniGwarancji: number; latWymiany: number };
  /** Sekcje, których dział IT nie śledzi — nie są pokazywane ani liczone na pulpicie. */
  ukryteSekcje: SekcjaStanuFloty[];
  podsumowanie: { komputery: number; zAktualnymOdczytem: number; zOdczytemCyklicznym: number };
  windows10: Komputer[];
  bitlocker: (Komputer & { stan: string; odczytId: number; odczytAt: string })[];
  entraId: (Komputer & { stan: string; odczytId: number; odczytAt: string })[];
  gwarancje: {
    sprzetTyp: 'KOMPUTER' | 'TELEFON' | 'DRUKARKA';
    id: number;
    identyfikator: string;
    markaModel: string;
    dataKoncaGwarancji: string;
    dniDoKonca: number;
  }[];
  doWymiany: (Komputer & { dataZakupu: string; wiekLat: number })[];
  bezDatyZakupu: number;
  bezOdczytu: (Komputer & {
    ostatniOdczyt: string | null;
    odczytCykliczny: { ostatnioAt: string | null } | null;
  })[];
}

const linkKomputera = (k: { id: number; numerEwidencyjny: string }) => (
  <Link
    to={`/computers/${k.id}`}
    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
  >
    {k.numerEwidencyjny}
  </Link>
);

const osoba = (k: Komputer) => (
  <span className="text-gray-500 dark:text-gray-400">
    {k.uzytkownik ?? 'nieprzypisany'}
    {k.dzial && ` · ${k.dzial}`}
  </span>
);

function Kafelek({
  kotwica,
  liczba,
  etykieta,
  powazne,
}: {
  kotwica: string;
  liczba: number;
  etykieta: string;
  powazne?: boolean;
}) {
  const kolor =
    liczba === 0
      ? 'text-green-600 dark:text-green-400'
      : powazne
        ? 'text-red-600 dark:text-red-400'
        : 'text-amber-600 dark:text-amber-400';
  return (
    <a href={`#${kotwica}`} className="card card-interactive block">
      <p className={`text-2xl font-semibold ${kolor}`}>{liczba === 0 ? '✓' : liczba}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{etykieta}</p>
    </a>
  );
}

function Sekcja({
  kotwica,
  tytul,
  opis,
  pusta,
  naglowki,
  onUkryj,
  zajete,
  children,
}: {
  kotwica: string;
  tytul: string;
  opis: ReactNode;
  pusta: boolean;
  naglowki: string[];
  onUkryj: () => void;
  zajete: boolean;
  children: ReactNode;
}) {
  return (
    <section id={kotwica} className="scroll-mt-20">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tytul}</h2>
        <button
          type="button"
          onClick={onUkryj}
          disabled={zajete}
          title="Ukryj sekcję — nie będzie też liczona na pulpicie"
          aria-label={`Ukryj sekcję: ${tytul}`}
          className="-my-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-900/[0.04] hover:text-gray-700 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-200"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Ukryj
        </button>
      </div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{opis}</p>
      {pusta ? (
        <div className="card text-sm text-green-700 dark:text-green-400">
          ✓ Wszystko w porządku.
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                {naglowki.map((n) => (
                  <th key={n}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Nazwy sekcji na liście ukrytych (bez progów, które są w tytułach samych sekcji). */
const NAZWY_SEKCJI: Record<SekcjaStanuFloty, string> = {
  windows10: 'Windows 10 bez wsparcia',
  bitlocker: 'Dysk bez szyfrowania (BitLocker)',
  entraId: 'Windows Pro bez Microsoft Entra ID',
  gwarancje: 'Kończące się gwarancje',
  doWymiany: 'Komputery do wymiany (wiek)',
  bezOdczytu: 'Bez aktualnego odczytu',
};

const STAN_BITLOCKERA: Record<string, string> = {
  WYLACZONY: 'wyłączony',
  WSTRZYMANY: 'wstrzymany (ochrona wyłączona)',
};

const STAN_ENTRA: Record<string, string> = {
  BRAK: 'nie jest dołączony',
  KONTO_SLUZBOWE: 'tylko konto służbowe, bez dołączenia',
};

export function StanFlotyPage() {
  const queryClient = useQueryClient();
  const { data: stan, isLoading } = useQuery({
    queryKey: ['stan-floty'],
    queryFn: () => api.get<StanFloty>('/stan-floty'),
  });
  const zapiszUkryte = useMutation({
    mutationFn: (ukryteSekcje: SekcjaStanuFloty[]) =>
      api.put<{ ukryteSekcje: SekcjaStanuFloty[] }>('/stan-floty/ustawienia', { ukryteSekcje }),
    onSuccess: ({ ukryteSekcje }) => {
      queryClient.setQueryData<StanFloty>(['stan-floty'], (stary) =>
        stary ? { ...stary, ukryteSekcje } : stary,
      );
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading || !stan)
    return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  const { progi, podsumowanie: p } = stan;
  const widoczna = (sekcja: SekcjaStanuFloty) => !stan.ukryteSekcje.includes(sekcja);
  const ukryj = (sekcja: SekcjaStanuFloty) => () =>
    zapiszUkryte.mutate([...stan.ukryteSekcje, sekcja]);
  const pokaz = (sekcja: SekcjaStanuFloty) =>
    zapiszUkryte.mutate(stan.ukryteSekcje.filter((s) => s !== sekcja));
  const zajete = zapiszUkryte.isPending;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Stan floty"
        subtitle={`${p.komputery} ${odmiana(p.komputery, ['komputer', 'komputery', 'komputerów'])} · aktualny odczyt (${progi.dniOdczytu} dni): ${p.zAktualnymOdczytem} · odczyt cykliczny: ${p.zOdczytemCyklicznym}`}
      />

      {zapiszUkryte.isError && (
        <p className="field-error">
          {zapiszUkryte.error instanceof ApiError
            ? zapiszUkryte.error.message
            : 'Nie udało się zapisać ustawień'}
        </p>
      )}

      {stan.ukryteSekcje.length < 6 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {widoczna('windows10') && (
            <Kafelek
              kotwica="windows10"
              liczba={stan.windows10.length}
              etykieta="Windows 10 bez wsparcia"
              powazne
            />
          )}
          {widoczna('bitlocker') && (
            <Kafelek
              kotwica="bitlocker"
              liczba={stan.bitlocker.length}
              etykieta="Dysk bez szyfrowania"
              powazne
            />
          )}
          {widoczna('entraId') && (
            <Kafelek kotwica="entra" liczba={stan.entraId.length} etykieta="Pro bez Entra ID" />
          )}
          {widoczna('gwarancje') && (
            <Kafelek
              kotwica="gwarancje"
              liczba={stan.gwarancje.length}
              etykieta={`Gwarancje do ${progi.dniGwarancji} dni`}
            />
          )}
          {widoczna('doWymiany') && (
            <Kafelek
              kotwica="wymiana"
              liczba={stan.doWymiany.length}
              etykieta={`Starsze niż ${progi.latWymiany} lat`}
            />
          )}
          {widoczna('bezOdczytu') && (
            <Kafelek
              kotwica="odczyty"
              liczba={stan.bezOdczytu.length}
              etykieta="Bez aktualnego odczytu"
            />
          )}
        </div>
      )}

      {widoczna('windows10') && (
        <Sekcja
          kotwica="windows10"
          onUkryj={ukryj('windows10')}
          zajete={zajete}
          tytul="Windows 10 bez wsparcia"
          opis="Wsparcie Windows 10 skończyło się 14 października 2025 — bez płatnych rozszerzonych aktualizacji (ESU) komputer nie dostaje poprawek bezpieczeństwa. Zaplanuj aktualizację do Windows 11 albo wymianę."
          pusta={stan.windows10.length === 0}
          naglowki={['Komputer', 'Model', 'System', 'Użytkownik']}
        >
          {stan.windows10.map((k) => (
            <tr key={k.id}>
              <td>{linkKomputera(k)}</td>
              <td>{k.markaModel}</td>
              <td>
                <SystemBadge system={k.systemOperacyjny} wersja={k.wersjaSystemu} />
              </td>
              <td>{osoba(k)}</td>
            </tr>
          ))}
        </Sekcja>
      )}

      {widoczna('bitlocker') && (
        <Sekcja
          kotwica="bitlocker"
          onUkryj={ukryj('bitlocker')}
          zajete={zajete}
          tytul="Dysk bez szyfrowania (BitLocker)"
          opis="Według ostatniego odczytu dysk systemowy nie jest chroniony. Zgubiony albo skradziony laptop bez szyfrowania to otwarty dostęp do danych firmy — włącz BitLocker (Pro) albo Szyfrowanie urządzenia (Home)."
          pusta={stan.bitlocker.length === 0}
          naglowki={['Komputer', 'Model', 'BitLocker', 'Użytkownik', 'Odczyt']}
        >
          {stan.bitlocker.map((k) => (
            <tr key={k.id}>
              <td>{linkKomputera(k)}</td>
              <td>{k.markaModel}</td>
              <td className="text-red-600 dark:text-red-400">
                {STAN_BITLOCKERA[k.stan] ?? k.stan}
              </td>
              <td>{osoba(k)}</td>
              <td className="whitespace-nowrap">
                <Link
                  to={`/odczyty/${k.odczytId}`}
                  className="text-xs text-indigo-600 dark:text-indigo-400"
                >
                  {formatujDate(k.odczytAt)}
                </Link>
              </td>
            </tr>
          ))}
        </Sekcja>
      )}

      {widoczna('entraId') && (
        <Sekcja
          kotwica="entra"
          onUkryj={ukryj('entraId')}
          zajete={zajete}
          tytul="Windows Pro bez Microsoft Entra ID"
          opis="Komputer z edycją Pro powinien być dołączony do Entra ID — wtedy pracownik loguje się kontem Microsoft 365, a Office, Teams i OneDrive logują się same. Dołączenie: Ustawienia → Konta → Dostęp do konta służbowego lub szkolnego."
          pusta={stan.entraId.length === 0}
          naglowki={['Komputer', 'System', 'Stan', 'Użytkownik', 'Odczyt']}
        >
          {stan.entraId.map((k) => (
            <tr key={k.id}>
              <td>{linkKomputera(k)}</td>
              <td>{k.systemOperacyjny ? SYSTEM_OPERACYJNY_LABELS[k.systemOperacyjny] : '—'}</td>
              <td className="text-amber-700 dark:text-amber-400">{STAN_ENTRA[k.stan] ?? k.stan}</td>
              <td>{osoba(k)}</td>
              <td className="whitespace-nowrap">
                <Link
                  to={`/odczyty/${k.odczytId}`}
                  className="text-xs text-indigo-600 dark:text-indigo-400"
                >
                  {formatujDate(k.odczytAt)}
                </Link>
              </td>
            </tr>
          ))}
        </Sekcja>
      )}

      {widoczna('gwarancje') && (
        <Sekcja
          kotwica="gwarancje"
          onUkryj={ukryj('gwarancje')}
          zajete={zajete}
          tytul={`Gwarancje kończące się w ciągu ${progi.dniGwarancji} dni`}
          opis="Komputery, telefony i drukarki — sprawdź przed końcem gwarancji, czy wszystko działa, i zgłoś usterki póki naprawa jest bezpłatna."
          pusta={stan.gwarancje.length === 0}
          naglowki={['Sprzęt', 'Model', 'Koniec gwarancji', 'Zostało']}
        >
          {stan.gwarancje.map((g) => (
            <tr key={`${g.sprzetTyp}-${g.id}`}>
              <td>
                <Link
                  to={`/${EQUIPMENT_API_SEGMENT[g.sprzetTyp]}/${g.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {g.identyfikator}
                </Link>{' '}
                <span className="text-xs text-gray-400">{EQUIPMENT_TYPE_LABELS[g.sprzetTyp]}</span>
              </td>
              <td>{g.markaModel}</td>
              <td>{new Date(g.dataKoncaGwarancji).toLocaleDateString('pl-PL')}</td>
              <td
                className={g.dniDoKonca <= 30 ? 'font-medium text-red-600 dark:text-red-400' : ''}
              >
                {g.dniDoKonca} {odmiana(g.dniDoKonca, ['dzień', 'dni', 'dni'])}
              </td>
            </tr>
          ))}
        </Sekcja>
      )}

      {widoczna('doWymiany') && (
        <Sekcja
          kotwica="wymiana"
          onUkryj={ukryj('doWymiany')}
          zajete={zajete}
          tytul={`Komputery starsze niż ${progi.latWymiany} lat`}
          opis={
            <>
              Wiek liczony od daty zakupu — do planu wymiany sprzętu.
              {stan.bezDatyZakupu > 0 &&
                ` ${stan.bezDatyZakupu} ${odmiana(stan.bezDatyZakupu, ['komputer nie ma', 'komputery nie mają', 'komputerów nie ma'])} daty zakupu — ich wieku nie da się ocenić.`}
            </>
          }
          pusta={stan.doWymiany.length === 0}
          naglowki={['Komputer', 'Model', 'Zakup', 'Wiek', 'Użytkownik']}
        >
          {stan.doWymiany.map((k) => (
            <tr key={k.id}>
              <td>{linkKomputera(k)}</td>
              <td>{k.markaModel}</td>
              <td>{new Date(k.dataZakupu).toLocaleDateString('pl-PL')}</td>
              <td>
                {k.wiekLat} {odmiana(k.wiekLat, ['rok', 'lata', 'lat'])}
              </td>
              <td>{osoba(k)}</td>
            </tr>
          ))}
        </Sekcja>
      )}

      {widoczna('bezOdczytu') && (
        <Sekcja
          kotwica="odczyty"
          onUkryj={ukryj('bezOdczytu')}
          zajete={zajete}
          tytul="Bez aktualnego odczytu"
          opis={`Komputery z Windowsem (lub bez określonego systemu), których ostatni odczyt jest starszy niż ${progi.dniOdczytu} dni albo nie było go wcale — dane w ewidencji mogą być nieaktualne, a powyższe sekcje ich nie obejmują. Włącz odczyt cykliczny na karcie komputera.`}
          pusta={stan.bezOdczytu.length === 0}
          naglowki={['Komputer', 'Model', 'Użytkownik', 'Ostatni odczyt', 'Odczyt cykliczny']}
        >
          {stan.bezOdczytu.map((k) => (
            <tr key={k.id}>
              <td>{linkKomputera(k)}</td>
              <td>{k.markaModel}</td>
              <td>{osoba(k)}</td>
              <td>{k.ostatniOdczyt ? formatujDate(k.ostatniOdczyt) : 'nigdy'}</td>
              <td>
                {k.odczytCykliczny ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    włączony —{' '}
                    {k.odczytCykliczny.ostatnioAt ? 'przestał wysyłać' : 'jeszcze nic nie wysłał'}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">wyłączony</span>
                )}
              </td>
            </tr>
          ))}
        </Sekcja>
      )}

      {stan.ukryteSekcje.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ukryte sekcje</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Nie są pokazywane tutaj ani liczone na pulpicie. Ustawienie dotyczy wszystkich
            administratorów.
          </p>
          <ul className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
            {stan.ukryteSekcje.map((sekcja) => (
              <li key={sekcja} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-gray-600 dark:text-gray-300">{NAZWY_SEKCJI[sekcja]}</span>
                <button
                  type="button"
                  className="btn-secondary px-2.5 py-1 text-xs"
                  onClick={() => pokaz(sekcja)}
                  disabled={zajete}
                  aria-label={`Pokaż sekcję: ${NAZWY_SEKCJI[sekcja]}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Pokaż
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

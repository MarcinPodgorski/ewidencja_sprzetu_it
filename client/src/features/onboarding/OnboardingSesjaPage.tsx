import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ONBOARDING_TRYB_LABELS } from 'shared';
import { KomendaDoSkopiowania } from '../../components/KomendaDoSkopiowania';
import { PageHeader } from '../../components/PageHeader';
import { apiUrl } from '../../lib/api';
import { useOnboardingSesja } from './onboarding.hooks';
import { StatusSesji } from './OnboardingSesjeTable';
import { formatujDate, formatujRozmiar, komendaStartowa } from './utils';

function Krok({ numer, children }: { numer: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
        {numer}
      </span>
      <div className="pt-0.5 text-sm text-gray-700 dark:text-gray-300">{children}</div>
    </li>
  );
}

function Pozycja({ etykieta, children }: { etykieta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500 dark:text-gray-400">{etykieta}</dt>
      <dd className="font-medium text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  );
}

export function OnboardingSesjaPage() {
  const { id } = useParams();
  const { data: sesja, isLoading, isError } = useOnboardingSesja(Number(id));

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  if (isError || !sesja) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono tego skryptu onboardingu.</div>;
  }

  const k = sesja.konfiguracja;
  const komenda = komendaStartowa(sesja.token);
  const login = k.loginLokalny ?? '';
  const nazwaPliku = `onboarding-${k.nazwaKomputera}.ps1`;
  const instalatory = k.programy.flatMap((p) => (p.typ === 'PLIK' ? [p] : []));

  const kod = (tekst: string) => <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">{tekst}</code>;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Skrypt onboardingu: ${k.nazwaKomputera}`}
        subtitle={`${ONBOARDING_TRYB_LABELS[sesja.tryb]} · ${k.imieNazwisko}`}
        backTo={`/computers/${sesja.computerId}`}
      />

      {sesja.wygasla && (
        <div className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Kod wygasł — polecenie już nie zadziała (plik do pobrania nadal tak).{' '}
          <Link to={`/computers/${sesja.computerId}/onboarding`} className="font-medium underline">
            Przygotuj nowy skrypt
          </Link>
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Polecenie do wpisania na laptopie</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <StatusSesji sesja={sesja} />
            <span>ważne do {formatujDate(sesja.wygasaAt)}</span>
          </div>
        </div>
        <KomendaDoSkopiowania komenda={komenda} />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Kod skryptu: <strong className="font-mono text-sm text-gray-800 dark:text-gray-200">{sesja.token}</strong> — laptop
          musi być w tej samej sieci co serwer aplikacji. Bez sieci:{' '}
          <a href={apiUrl(`/onboarding/sesje/${sesja.id}/skrypt`)} download className="font-medium text-indigo-600 dark:text-indigo-400">
            pobierz plik {nazwaPliku}
          </a>
          , skopiuj na pendrive i uruchom: {kod(`powershell -ExecutionPolicy Bypass -File D:\\${nazwaPliku}`)} (D: to litera pendrive’a).
        </p>
        {instalatory.length > 0 && (
          <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
            Skrypt pobierze instalatory z serwera. Uruchamiając go z pendrive’a bez dostępu do serwera (albo po wygaśnięciu
            kodu), połóż obok skryptu:
            <ul className="mt-1 space-y-0.5">
              {instalatory.map((p) => (
                <li key={p.oprogramowanieId}>
                  <a
                    href={apiUrl(`/oprogramowanie/${p.oprogramowanieId}/plik`)}
                    download
                    className="font-medium text-indigo-600 dark:text-indigo-400"
                  >
                    {p.plikNazwa}
                  </a>{' '}
                  ({formatujRozmiar(p.plikRozmiar)}) — skrypt sprawdzi sumę kontrolną przed uruchomieniem
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Krok po kroku</h2>
          {sesja.tryb === 'HOME' ? (
            <ol className="space-y-4">
              <Krok numer={1}>
                Włącz laptopa i przejdź kreator pierwszego uruchomienia. Windows 11 Home wymaga internetu i konta Microsoft —
                użyj <strong>firmowego konta IT</strong>, nie prywatnego pracownika (tam trafi też klucz odzyskiwania
                szyfrowania dysku). Jeśli kreator zapyta o nazwę urządzenia, wpisz {kod(k.nazwaKomputera)}.
              </Krok>
              <Krok numer={2}>
                Kliknij prawym przyciskiem <strong>Start</strong> → <strong>Terminal (administrator)</strong> i wpisz polecenie z
                ramki powyżej.
              </Krok>
              <Krok numer={3}>
                Skrypt pokaże, co zrobi, i poprosi o potwierdzenie. Potem zapyta o <strong>hasło początkowe</strong> dla konta{' '}
                {kod(login)} — przekaż je pracownikowi.
              </Krok>
              <Krok numer={4}>Na koniec zrestartuj komputer — skrypt o to zapyta.</Krok>
              <Krok numer={5}>
                Pracownik loguje się na konto {kod(login)} i ustawia własne hasło.
                {k.emailM365 && (
                  <>
                    {' '}
                    Windows od razu przypomni mu o Microsoft 365: w oknie „Dostęp do konta służbowego lub szkolnego” klika{' '}
                    <strong>Połącz</strong> i loguje się jako {kod(k.emailM365)} (hasło + MFA).
                  </>
                )}
              </Krok>
            </ol>
          ) : (
            <ol className="space-y-4">
              <Krok numer={1}>
                Włącz laptopa. W kreatorze wybierz konfigurację <strong>do pracy lub szkoły</strong> (nie do użytku
                osobistego) i zaloguj się <strong>kontem IT w Microsoft 365</strong> — laptop dołączy do Entra ID, a konto IT
                zostanie jego administratorem. Kreator może poprosić o ustawienie PIN-u. Jeśli zapyta o nazwę urządzenia,
                wpisz {kod(k.nazwaKomputera)}.
              </Krok>
              <Krok numer={2}>
                Kliknij prawym przyciskiem <strong>Start</strong> → <strong>Terminal (administrator)</strong> i wpisz polecenie z
                ramki powyżej.
              </Krok>
              <Krok numer={3}>Skrypt pokaże, co zrobi, i poprosi o potwierdzenie. Na koniec zrestartuj komputer.</Krok>
              <Krok numer={4}>
                Pracownik na ekranie logowania wybiera <strong>Inny użytkownik</strong> i loguje się jako{' '}
                {k.emailM365 ? kod(k.emailM365) : 'swoim kontem Microsoft 365'} (hasło + MFA, potem ustawia PIN). Office, Teams
                i OneDrive zalogują się same.
              </Krok>
            </ol>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Co zrobi skrypt</h2>
          <dl className="space-y-3 text-sm">
            <Pozycja etykieta="Komunikat przy logowaniu">{k.komunikat ? `„${k.komunikat.tytul}”` : 'bez komunikatu'}</Pozycja>
            <Pozycja etykieta="Programy">
              {k.programy.length > 0
                ? k.programy.map((p) => (p.typ === 'PLIK' ? `${p.nazwa} (plik)` : p.nazwa)).join(', ')
                : 'brak'}
            </Pozycja>
            <Pozycja etykieta="Microsoft 365 Apps">{k.m365Apps ? 'tak (po polsku)' : 'nie'}</Pozycja>
            {sesja.tryb === 'HOME' ? (
              <>
                <Pozycja etykieta="Konto lokalne">
                  {login} — zwykły użytkownik, zmiana hasła przy pierwszym logowaniu
                </Pozycja>
                <Pozycja etykieta="Połączenie z Microsoft 365">
                  {k.emailM365 ? `przypomnienie przy logowaniu (${k.emailM365})` : 'pominięte — brak e-maila'}
                </Pozycja>
              </>
            ) : (
              <Pozycja etykieta="OneDrive">automatyczne logowanie kontem z Windowsa</Pozycja>
            )}
            <Pozycja etykieta="Dane sprzętu">wysyła odczyt do ewidencji — do przejrzenia na karcie komputera</Pozycja>
            <Pozycja etykieta="Nazwa komputera">{k.nazwaKomputera} (po restarcie)</Pozycja>
            <Pozycja etykieta="Wygenerował">
              {sesja.utworzylAppUser?.login ?? '—'}, {formatujDate(sesja.createdAt)}
            </Pozycja>
          </dl>
        </div>
      </div>
    </div>
  );
}

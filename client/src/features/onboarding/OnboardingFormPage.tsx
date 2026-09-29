import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ONBOARDING_TRYB_LABELS,
  SYSTEM_OPERACYJNY_LABELS,
  edycjaWindowsa,
  onboardingSesjaCreateSchema,
  rodzinaSystemu,
  type OnboardingTryb,
} from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../lib/api';
import { computersApi, employeesApi, oprogramowanieApi, profileOprogramowaniaApi } from '../entities';
import { useUstawieniaOnboardingu, useUtworzSesjeOnboardingu } from './onboarding.hooks';
import { sugerowanyLogin, wypelnijSzablon } from './utils';

const OPISY_TRYBOW: Record<OnboardingTryb, string> = {
  HOME: 'Skrypt zakłada lokalne konto pracownika. Z Microsoft 365 pracownik połączy się sam przy pierwszym logowaniu — Windows mu o tym przypomni.',
  PRO: 'Laptop dołączasz do Entra ID w kreatorze pierwszego uruchomienia, a pracownik loguje się do Windowsa kontem Microsoft 365 (Office, Teams i OneDrive logują się same).',
};

type Bledy = Partial<Record<string, string>>;

export function OnboardingFormPage() {
  const { id } = useParams();
  const computerId = Number(id);
  const navigate = useNavigate();

  const { data: computer, isLoading, isError } = computersApi.useDetail(computerId);
  const { data: pracownicy } = employeesApi.useList();
  const { data: katalog } = oprogramowanieApi.useList();
  const { data: profile } = profileOprogramowaniaApi.useList();
  const { data: ustawienia } = useUstawieniaOnboardingu();
  const utworz = useUtworzSesjeOnboardingu();

  const [employeeId, setEmployeeId] = useState('');
  const [tryb, setTryb] = useState<OnboardingTryb | ''>('');
  const [nazwaKomputera, setNazwaKomputera] = useState('');
  const [loginLokalny, setLoginLokalny] = useState('');
  const [emailM365, setEmailM365] = useState('');
  const [komunikatWlaczony, setKomunikatWlaczony] = useState(true);
  const [komunikatTytul, setKomunikatTytul] = useState('');
  const [komunikatTresc, setKomunikatTresc] = useState('');
  const [profilId, setProfilId] = useState('');
  const [wybrane, setWybrane] = useState<Set<number>>(new Set());
  const [m365Apps, setM365Apps] = useState(false);
  const [odczytCykliczny, setOdczytCykliczny] = useState(true);
  const [przypisz, setPrzypisz] = useState(true);
  const [bledy, setBledy] = useState<Bledy>({});

  const pracownik = useMemo(() => pracownicy?.find((p) => p.id === Number(employeeId)), [pracownicy, employeeId]);

  // Start: nazwa komputera = numer ewidencyjny, pracownik = obecny użytkownik komputera,
  // edycja Windowsa = system zapisany w ewidencji (jeśli to Home albo Pro).
  useEffect(() => {
    if (!computer) return;
    setNazwaKomputera(computer.numerEwidencyjny);
    if (computer.aktualnyUzytkownikId) setEmployeeId(String(computer.aktualnyUzytkownikId));
    const edycja = edycjaWindowsa(computer.systemOperacyjny);
    if (edycja) setTryb(edycja);
  }, [computer]);

  // Zmiana pracownika podpowiada login, e-mail, komunikat i profil jego działu.
  useEffect(() => {
    if (!pracownik || !computer) return;
    setLoginLokalny(sugerowanyLogin(pracownik.imie, pracownik.nazwisko));
    setEmailM365(pracownik.email ?? '');
    if (ustawienia) {
      const dane = {
        komputer: computer.numerEwidencyjny,
        pracownik: `${pracownik.imie} ${pracownik.nazwisko}`,
        dzial: pracownik.dzial?.nazwa ?? '',
      };
      setKomunikatTytul(wypelnijSzablon(ustawienia.komunikatTytul, dane));
      setKomunikatTresc(wypelnijSzablon(ustawienia.komunikatTresc, dane));
      setKomunikatWlaczony(ustawienia.komunikatTytul.trim() !== '');
    }
    const profilDzialu = profile?.find((p) => p.dzialId === pracownik.dzialId);
    if (profilDzialu) wybierzProfil(String(profilDzialu.id));
  }, [pracownik, computer, ustawienia, profile]);

  function wybierzProfil(id: string) {
    setProfilId(id);
    const profil = profile?.find((p) => p.id === Number(id));
    if (profil) setWybrane(new Set(profil.oprogramowanie.map((o) => o.id)));
  }

  function przelacz(id: number) {
    setWybrane((prev) => {
      const nastepne = new Set(prev);
      if (nastepne.has(id)) nastepne.delete(id);
      else nastepne.add(id);
      return nastepne;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      computerId,
      employeeId: employeeId ? Number(employeeId) : undefined,
      tryb: tryb || undefined,
      nazwaKomputera,
      loginLokalny: tryb === 'HOME' ? loginLokalny : undefined,
      emailM365: emailM365 || undefined,
      komunikat: komunikatWlaczony ? { tytul: komunikatTytul, tresc: komunikatTresc } : null,
      oprogramowanieIds: [...wybrane],
      m365Apps,
      odczytCykliczny,
      przypiszDoPracownika: przypisz,
    };

    const wynik = onboardingSesjaCreateSchema.safeParse(payload);
    if (!wynik.success) {
      const nowe: Bledy = {};
      for (const issue of wynik.error.issues) {
        const pole = issue.path.join('.');
        if (!nowe[pole]) nowe[pole] = issue.message;
      }
      if (!tryb) nowe.tryb = 'Wybierz edycję Windowsa';
      if (!employeeId) nowe.employeeId = 'Wybierz pracownika';
      setBledy(nowe);
      return;
    }

    setBledy({});
    try {
      const sesja = await utworz.mutateAsync(wynik.data);
      navigate(`/onboarding/sesje/${sesja.id}`);
    } catch (err) {
      setBledy({ root: err instanceof ApiError ? err.message : 'Nie udało się wygenerować skryptu' });
    }
  }

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  if (isError || !computer) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono komputera.</div>;
  }

  const przypisanyDoKogosInnego = computer.aktualnyUzytkownikId !== null && computer.aktualnyUzytkownikId !== Number(employeeId);
  const systemKomputera = computer.systemOperacyjny;
  const nazwaSystemu = systemKomputera ? SYSTEM_OPERACYJNY_LABELS[systemKomputera] : null;
  const edycjaZEwidencji = edycjaWindowsa(systemKomputera);
  // Windows Server i systemy spoza Windowsa — skrypt nie jest dla nich przygotowany.
  const systemNieobslugiwany =
    systemKomputera !== null && systemKomputera !== 'INNY' && (rodzinaSystemu(systemKomputera) !== 'WINDOWS' || !edycjaZEwidencji);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Skrypt onboardingu: ${computer.numerEwidencyjny}`}
        subtitle={computer.markaModel}
        backTo={`/computers/${computer.id}`}
      />

      {computer.wycofany && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Ten komputer jest wycofany — przywróć go, zanim przygotujesz skrypt.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pracownik i Windows</h2>

          <div>
            <label className="label">
              Pracownik <span className="text-red-500">*</span>
            </label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Wybierz pracownika…</option>
              {pracownicy?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nazwisko} {p.imie} {p.dzial ? `(${p.dzial.nazwa})` : ''}
                </option>
              ))}
            </select>
            {bledy.employeeId && <p className="field-error">{bledy.employeeId}</p>}
          </div>

          <div>
            <label className="label">
              Edycja Windowsa na laptopie <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(['HOME', 'PRO'] as const).map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-md border p-3 text-sm ${
                    tryb === t
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                    <input type="radio" name="tryb" checked={tryb === t} onChange={() => setTryb(t)} />
                    {ONBOARDING_TRYB_LABELS[t]}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{OPISY_TRYBOW[t]}</span>
                </label>
              ))}
            </div>
            {bledy.tryb && <p className="field-error">{bledy.tryb}</p>}
            {!bledy.tryb && systemNieobslugiwany && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                W ewidencji ten komputer ma system {nazwaSystemu} — skrypt onboardingu jest przygotowany pod Windows Home
                i Pro.
              </p>
            )}
            {!bledy.tryb && edycjaZEwidencji && tryb === edycjaZEwidencji && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Zaznaczone na podstawie ewidencji: {nazwaSystemu}.
              </p>
            )}
            {!bledy.tryb && edycjaZEwidencji && tryb !== '' && tryb !== edycjaZEwidencji && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                W ewidencji ten komputer ma system {nazwaSystemu} — sprawdź, czy wybrana edycja się zgadza.
              </p>
            )}
            {!bledy.tryb && systemKomputera === null && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Uzupełnij system operacyjny w danych komputera, a edycja zaznaczy się tu sama.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Nazwa komputera <span className="text-red-500">*</span>
              </label>
              <input className="input font-mono" value={nazwaKomputera} onChange={(e) => setNazwaKomputera(e.target.value)} />
              {bledy.nazwaKomputera ? (
                <p className="field-error">{bledy.nazwaKomputera}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Max 15 znaków: litery, cyfry i myślniki.</p>
              )}
            </div>
            {tryb === 'HOME' && (
              <div>
                <label className="label">
                  Login konta lokalnego <span className="text-red-500">*</span>
                </label>
                <input className="input font-mono" value={loginLokalny} onChange={(e) => setLoginLokalny(e.target.value)} />
                {bledy.loginLokalny ? (
                  <p className="field-error">{bledy.loginLokalny}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Hasło początkowe wpiszesz przy uruchomieniu skryptu — nie trafia do aplikacji.
                  </p>
                )}
              </div>
            )}
            <div className={tryb === 'HOME' ? 'sm:col-span-2' : ''}>
              <label className="label">E-mail / login Microsoft 365</label>
              <input className="input" value={emailM365} onChange={(e) => setEmailM365(e.target.value)} placeholder="np. jan.nowak@firma.pl" />
              {bledy.emailM365 ? (
                <p className="field-error">{bledy.emailM365}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {tryb === 'PRO'
                    ? 'Pojawi się w instrukcji — tym kontem pracownik zaloguje się do Windowsa.'
                    : 'Bez e-maila skrypt pominie przypomnienie o połączeniu z Microsoft 365.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
              checked={komunikatWlaczony}
              onChange={(e) => setKomunikatWlaczony(e.target.checked)}
            />
            Komunikat przy logowaniu
          </label>
          {komunikatWlaczony && (
            <>
              <div>
                <label className="label">Tytuł</label>
                <input className="input" value={komunikatTytul} onChange={(e) => setKomunikatTytul(e.target.value)} />
                {bledy['komunikat.tytul'] && <p className="field-error">{bledy['komunikat.tytul']}</p>}
              </div>
              <div>
                <label className="label">Treść</label>
                <textarea className="input" rows={4} value={komunikatTresc} onChange={(e) => setKomunikatTresc(e.target.value)} />
                {bledy['komunikat.tresc'] && <p className="field-error">{bledy['komunikat.tresc']}</p>}
              </div>
            </>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Oprogramowanie</h2>
            <select className="input max-w-xs" value={profilId} onChange={(e) => wybierzProfil(e.target.value)}>
              <option value="">Wczytaj profil…</option>
              {profile?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nazwa}
                  {p.dzial ? ` (${p.dzial.nazwa})` : ''}
                </option>
              ))}
            </select>
          </div>
          {katalog && katalog.length > 0 ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {katalog.map((program) => (
                <label key={program.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                    checked={wybrane.has(program.id)}
                    onChange={() => przelacz(program.id)}
                  />
                  {program.nazwa}
                  {program.zrodlo === 'PLIK' && (
                    <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">plik</span>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Katalog programów jest pusty — dodasz je w Administracja → Onboarding.</p>
          )}

          <label className="flex items-start gap-2 border-t border-gray-100 pt-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
              checked={m365Apps}
              onChange={(e) => setM365Apps(e.target.checked)}
            />
            <span>
              <span className="font-medium">Microsoft 365 Apps</span> — Word, Excel, PowerPoint, Outlook (po polsku)
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Tylko dla licencji z aplikacjami desktopowymi, np. Business Standard. Business Basic ma wyłącznie wersje w
                przeglądarce — tam zostaw to pole puste.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 border-t border-gray-100 pt-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
              checked={odczytCykliczny}
              onChange={(e) => setOdczytCykliczny(e.target.checked)}
            />
            <span>
              <span className="font-medium">Odczyt cykliczny do ewidencji</span> — co tydzień
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Zadanie w Harmonogramie zadań wysyła dane sprzętu (model, pamięć, dyski, Windows, BitLocker). Zmiany zobaczysz na
                karcie komputera i w Stanie floty.
              </span>
            </span>
          </label>
        </div>

        {pracownik && computer.aktualnyUzytkownikId !== pracownik.id && (
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
              checked={przypisz}
              onChange={(e) => setPrzypisz(e.target.checked)}
            />
            <span>
              Przypisz komputer do: {pracownik.imie} {pracownik.nazwisko}
              {przypisanyDoKogosInnego && (
                <span className="block text-xs text-amber-600 dark:text-amber-400">
                  Komputer jest teraz przypisany do: {computer.aktualnyUzytkownik?.imie} {computer.aktualnyUzytkownik?.nazwisko} —
                  zmiana zapisze się w historii przypisań.
                </span>
              )}
            </span>
          </label>
        )}

        {bledy.root && <p className="field-error">{bledy.root}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(`/computers/${computer.id}`)}>
            Anuluj
          </button>
          <button type="submit" className="btn-primary" disabled={utworz.isPending || computer.wycofany}>
            {utworz.isPending ? 'Generowanie…' : 'Wygeneruj skrypt'}
          </button>
        </div>
      </form>
    </div>
  );
}

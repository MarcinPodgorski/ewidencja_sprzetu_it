import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CardSim,
  CheckCircle2,
  Download,
  FileUp,
  Keyboard,
  Laptop,
  Loader2,
  Monitor,
  Mouse,
  Printer,
  Smartphone,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  COMPUTER_TYPE_LABELS,
  MAX_WIERSZY_IMPORTU,
  PHONE_TYPE_LABELS,
  POLA_IMPORTU,
  SYSTEM_OPERACYJNY_LABELS,
  TYPY_IMPORTU,
  type ImportInput,
  type PoleImportu,
  type TypImportu,
  type WartoscImportu,
  type WierszImportu,
} from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../lib/api';
import { odmiana } from '../../lib/odmiana';
import { useOpoznione } from '../../lib/useOpoznione';
import { useSprawdzImport, useZapiszImport } from './import.hooks';
import { dopasujKolumny, literaKolumny, parsujTabele, szablonCsv, wczytajPlik, wygladaNaNaglowki } from './parsowanie';

type Wiersze = ImportInput['wiersze'];

const TYPY: Record<TypImportu, { etykieta: string; ikona: LucideIcon; lista: string; biernik: [string, string, string] }> = {
  PRACOWNIK: { etykieta: 'Pracownicy', ikona: Users, lista: '/employees', biernik: ['pracownika', 'pracowników', 'pracowników'] },
  KOMPUTER: { etykieta: 'Komputery', ikona: Laptop, lista: '/computers', biernik: ['komputer', 'komputery', 'komputerów'] },
  MONITOR: { etykieta: 'Monitory', ikona: Monitor, lista: '/monitors', biernik: ['monitor', 'monitory', 'monitorów'] },
  MYSZ: { etykieta: 'Myszy', ikona: Mouse, lista: '/mice', biernik: ['mysz', 'myszy', 'myszy'] },
  KLAWIATURA: { etykieta: 'Klawiatury', ikona: Keyboard, lista: '/keyboards', biernik: ['klawiaturę', 'klawiatury', 'klawiatur'] },
  TELEFON: { etykieta: 'Telefony', ikona: Smartphone, lista: '/phones', biernik: ['telefon', 'telefony', 'telefonów'] },
  KARTA_SIM: { etykieta: 'Karty SIM', ikona: CardSim, lista: '/sim-cards', biernik: ['kartę SIM', 'karty SIM', 'kart SIM'] },
  DRUKARKA: { etykieta: 'Drukarki', ikona: Printer, lista: '/printers', biernik: ['drukarkę', 'drukarki', 'drukarek'] },
};

/** Ile wierszy podglądu renderować naraz — tysiąc wierszy tabeli spowolniłby stronę. */
const LIMIT_PODGLADU = 300;

function formatujWartosc(klucz: string, wartosc: WartoscImportu | undefined): string {
  if (wartosc === null || wartosc === undefined || wartosc === '') return '—';
  const tekst = String(wartosc);
  switch (klucz) {
    case 'typ':
      return COMPUTER_TYPE_LABELS[tekst as keyof typeof COMPUTER_TYPE_LABELS] ?? PHONE_TYPE_LABELS[tekst as keyof typeof PHONE_TYPE_LABELS] ?? tekst;
    case 'systemOperacyjny':
      return SYSTEM_OPERACYJNY_LABELS[tekst as keyof typeof SYSTEM_OPERACYJNY_LABELS] ?? tekst;
    case 'ramRodzaj':
      return tekst === 'INNY' ? 'inny' : tekst;
    case 'ramIloscGb':
      return `${tekst} GB`;
    case 'wielkoscEkranu':
      return `${tekst.replace('.', ',')}″`;
    case 'kosztBruttoGrosze':
    case 'kosztMiesiecznyGrosze':
      return `${(Number(wartosc) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
    case 'dataZakupu':
    case 'dataKoncaGwarancji':
    case 'dataKoncaUmowy':
      return new Date(tekst).toLocaleDateString('pl-PL', { timeZone: 'UTC' });
    default:
      return tekst;
  }
}

/** Wymagane pola bez kolumny (z uwzględnieniem pól zastępujących, np. „Imię i nazwisko”). */
function brakujacePola(pola: PoleImportu[], zmapowane: Set<string>): PoleImportu[] {
  return pola.filter(
    (p) => p.wymagane && !zmapowane.has(p.klucz) && !pola.some((q) => q.zastepuje?.includes(p.klucz) && zmapowane.has(q.klucz)),
  );
}

function StatusWiersza({ wiersz }: { wiersz: WierszImportu }) {
  if (wiersz.bledy.length > 0) {
    return <XCircle className="h-4 w-4 text-red-500" aria-label="Błędy — wiersz zostanie pominięty" />;
  }
  if (wiersz.ostrzezenia.length > 0) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Ostrzeżenia" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Poprawny" />;
}

export function ImportPage() {
  const [typ, setTyp] = useState<TypImportu>('KOMPUTER');
  const [tekst, setTekst] = useState('');
  const [plik, setPlik] = useState<string | null>(null);
  const [bladPliku, setBladPliku] = useState<string | null>(null);
  const [naglowkiRecznie, setNaglowkiRecznie] = useState<boolean | null>(null);
  const [mapowanieReczne, setMapowanieReczne] = useState<(string | null)[] | null>(null);
  const [tylkoUwagi, setTylkoUwagi] = useState(false);
  const plikRef = useRef<HTMLInputElement>(null);
  const zapisz = useZapiszImport();

  const pola = POLA_IMPORTU[typ];
  const tabela = useMemo(() => parsujTabele(tekst), [tekst]);
  const liczbaKolumn = useMemo(() => tabela.reduce((max, w) => Math.max(max, w.length), 0), [tabela]);
  const naglowki = naglowkiRecznie ?? (tabela.length > 0 && wygladaNaNaglowki(tabela[0], pola));
  const mapowanie = useMemo(() => {
    if (mapowanieReczne && mapowanieReczne.length === liczbaKolumn) return mapowanieReczne;
    const auto = naglowki && tabela.length > 0 ? dopasujKolumny(tabela[0], pola) : [];
    return Array.from({ length: liczbaKolumn }, (_, i) => auto[i] ?? null);
  }, [mapowanieReczne, liczbaKolumn, naglowki, tabela, pola]);
  const zmapowane = useMemo(() => new Set(mapowanie.filter((k): k is string => k !== null)), [mapowanie]);
  const daneTabeli = useMemo(() => (naglowki ? tabela.slice(1) : tabela), [tabela, naglowki]);

  const wiersze: Wiersze = useMemo(() => {
    const pierwszyNr = naglowki ? 2 : 1;
    return daneTabeli
      .map((komorki, i) => ({
        nr: pierwszyNr + i,
        dane: Object.fromEntries(mapowanie.flatMap((klucz, k) => (klucz ? [[klucz, komorki[k] ?? '']] : []))),
      }))
      .filter((w) => Object.values(w.dane).some((v) => v.trim() !== ''));
  }, [daneTabeli, mapowanie, naglowki]);

  // Sprawdzenie na serwerze po chwili bez zmian; porównanie po treści (tekst JSON), nie po referencji.
  const klucz = useMemo(() => JSON.stringify({ typ, wiersze }), [typ, wiersze]);
  const kluczSprawdzany = useOpoznione(klucz, 350);
  const sprawdzane = useMemo(() => JSON.parse(kluczSprawdzany) as { typ: TypImportu; wiersze: Wiersze }, [kluczSprawdzany]);
  const zaDuzo = wiersze.length > MAX_WIERSZY_IMPORTU;
  const sprawdz = useSprawdzImport(
    sprawdzane.typ,
    sprawdzane.wiersze,
    sprawdzane.wiersze.length > 0 && sprawdzane.wiersze.length <= MAX_WIERSZY_IMPORTU && !zapisz.isSuccess,
  );
  const aktualny = kluczSprawdzany === klucz && !sprawdz.isFetching;
  const wynik = sprawdz.data;
  const surowe = useMemo(() => new Map(sprawdzane.wiersze.map((w) => [w.nr, w.dane])), [sprawdzane]);

  function zmienTekst(nowy: string, nazwaPliku: string | null = null) {
    setTekst(nowy);
    setPlik(nazwaPliku);
    setBladPliku(null);
    setNaglowkiRecznie(null);
    setMapowanieReczne(null);
  }

  function zmienTyp(nowy: TypImportu) {
    setTyp(nowy);
    setNaglowkiRecznie(null);
    setMapowanieReczne(null);
  }

  function zmienMapowanie(kolumna: number, klucz: string) {
    const nowe = [...mapowanie];
    // Pole może mieć tylko jedną kolumnę — poprzednia traci przypisanie.
    if (klucz) {
      nowe.forEach((k, i) => {
        if (k === klucz) nowe[i] = null;
      });
    }
    nowe[kolumna] = klucz || null;
    setMapowanieReczne(nowe);
  }

  async function onPlik(e: ChangeEvent<HTMLInputElement>) {
    const wybrany = e.target.files?.[0];
    e.target.value = ''; // ten sam plik wybrany drugi raz też ma się wczytać
    if (!wybrany) return;
    if (/\.xlsx?$|\.ods$/i.test(wybrany.name)) {
      setBladPliku('To plik arkusza, nie CSV — w Excelu wybierz Plik → Zapisz jako → „CSV UTF-8”, albo po prostu skopiuj komórki i wklej je powyżej.');
      return;
    }
    zmienTekst(await wczytajPlik(wybrany), wybrany.name);
  }

  function pobierzSzablon() {
    const url = URL.createObjectURL(szablonCsv(pola));
    const a = document.createElement('a');
    a.href = url;
    a.download = `szablon-importu-${TYPY[typ].etykieta.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importujKolejne() {
    zapisz.reset();
    zmienTekst('');
  }

  const zapisano = zapisz.data?.zapisano;
  if (zapisz.isSuccess && zapisano) {
    const pominiete = zapisz.data.zBledami;
    return (
      <div className="max-w-3xl">
        <PageHeader title="Import z Excela" />
        <div className="card animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Zaimportowano {zapisano.liczba} {odmiana(zapisano.liczba, TYPY[typ].biernik)}
              </h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {pominiete > 0 && (
                  <p>
                    Pominięto {pominiete} {odmiana(pominiete, ['wiersz', 'wiersze', 'wierszy'])} z błędami — popraw je w arkuszu
                    i zaimportuj jeszcze raz (już dodane pozycje zostaną rozpoznane jako duplikaty).
                  </p>
                )}
                {zapisz.data.noweDzialy.length > 0 && <p>Utworzone działy: {zapisz.data.noweDzialy.join(', ')}.</p>}
                <p>Każda pozycja ma w historii zmian wpis „import z Excela”.</p>
                {zapisano.kopia ? (
                  <p>
                    Kopia zapasowa sprzed importu: <span className="font-mono text-xs">{zapisano.kopia}</span> (Administracja →{' '}
                    <Link to="/kopie" className="text-indigo-600 hover:underline dark:text-indigo-400">
                      Kopie zapasowe
                    </Link>
                    ).
                  </p>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300">Nie udało się zrobić kopii przed importem: {zapisano.bladKopii}</p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={TYPY[typ].lista} className="btn-primary">
                  Przejdź do listy
                </Link>
                <button type="button" className="btn-secondary" onClick={importujKolejne}>
                  Importuj kolejne
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const brakujace = brakujacePola(pola, zmapowane);
  const polaSprawdzane = POLA_IMPORTU[sprawdzane.typ];
  const kolumnyPodgladu = wynik
    ? polaSprawdzane.filter((p) => wynik.wiersze.some((w) => p.klucz in w.wartosci || w.bledy.some((b) => b.pole === p.klucz)))
    : [];
  const wierszePodgladu = wynik
    ? wynik.wiersze.filter((w) => !tylkoUwagi || w.bledy.length > 0 || w.ostrzezenia.length > 0)
    : [];
  const zOstrzezeniami = wynik ? wynik.wiersze.filter((w) => w.bledy.length === 0 && w.ostrzezenia.length > 0).length : 0;
  const etykietaPola = (klucz: string | null) => polaSprawdzane.find((p) => p.klucz === klucz)?.etykieta ?? klucz;
  const moznaImportowac = aktualny && !!wynik && wynik.poprawne > 0 && !zaDuzo && !zapisz.isPending;

  return (
    <div className="max-w-6xl pb-24">
      <PageHeader
        title="Import z Excela"
        subtitle="Wklej komórki z arkusza albo wczytaj plik CSV — przed zapisem zobaczysz, jak aplikacja zrozumiała każdy wiersz."
      />

      <section className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">1. Co importujesz?</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPY_IMPORTU.map((t) => {
            const { etykieta, ikona: Ikona } = TYPY[t];
            const wybrany = t === typ;
            return (
              <button
                key={t}
                type="button"
                onClick={() => zmienTyp(t)}
                aria-pressed={wybrany}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition duration-200 active:scale-[0.98] ${
                  wybrany
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400 dark:border-indigo-400/60 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-400/60'
                    : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:border-indigo-400/40 dark:hover:bg-white/5'
                }`}
              >
                <Ikona className={`h-4 w-4 shrink-0 ${wybrany ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400'}`} />
                {etykieta}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Zaczynasz od zera? Najpierw pracownicy — sprzęt przypisuje się do nich po imieniu i nazwisku (albo e&#8209;mailu). Telefony
          łączą się z kartami SIM po numerze, więc karty importuj przed telefonami.
        </p>
      </section>

      <section className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">2. Dane</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Zaznacz w Excelu komórki razem z wierszem nagłówków, skopiuj (Ctrl+C) i wklej poniżej (Ctrl+V).
        </p>
        <textarea
          className="input mt-3 min-h-[9rem] font-mono text-xs"
          placeholder="Wklej tutaj dane z arkusza…"
          value={tekst}
          onChange={(e) => zmienTekst(e.target.value)}
          spellCheck={false}
          wrap="off"
          aria-label="Dane z arkusza"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => plikRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Wczytaj plik CSV
          </button>
          <input ref={plikRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={onPlik} />
          <button type="button" className="btn-secondary text-sm" onClick={pobierzSzablon}>
            <Download className="h-4 w-4" />
            Pusty szablon (CSV)
          </button>
          {plik && <span className="text-sm text-gray-500 dark:text-gray-400">Wczytano: {plik}</span>}
          {tabela.length > 0 && (
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                checked={naglowki}
                onChange={(e) => {
                  setNaglowkiRecznie(e.target.checked);
                  setMapowanieReczne(null);
                }}
              />
              Pierwszy wiersz to nagłówki
            </label>
          )}
        </div>
        {bladPliku && <p className="field-error">{bladPliku}</p>}
        {tabela.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {daneTabeli.length} {odmiana(daneTabeli.length, ['wiersz', 'wiersze', 'wierszy'])} danych, {liczbaKolumn}{' '}
            {odmiana(liczbaKolumn, ['kolumna', 'kolumny', 'kolumn'])}.
          </p>
        )}
        {zaDuzo && (
          <p className="field-error">
            Najwyżej {MAX_WIERSZY_IMPORTU} wierszy naraz — podziel arkusz na części.
          </p>
        )}
      </section>

      {liczbaKolumn > 0 && (
        <section className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">3. Kolumny</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {naglowki
              ? 'Dopasowane po nagłówkach — popraw, jeśli coś się nie zgadza. Kolumny bez pola zostaną pominięte.'
              : 'Wskaż, co jest w której kolumnie. Kolumny bez pola zostaną pominięte.'}
          </p>
          {brakujace.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Brakuje {odmiana(brakujace.length, ['kolumny', 'kolumn', 'kolumn'])}: {brakujace.map((p) => p.etykieta).join(', ')} —
                bez nich wiersze nie przejdą sprawdzenia.
              </span>
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mapowanie.map((klucz, kolumna) => {
              const pole = pola.find((p) => p.klucz === klucz);
              const przyklady = daneTabeli
                .map((w) => (w[kolumna] ?? '').trim())
                .filter(Boolean)
                .slice(0, 3);
              return (
                <div
                  key={kolumna}
                  className={`rounded-xl border p-3 ${
                    klucz ? 'border-indigo-200 dark:border-indigo-400/30' : 'border-dashed border-gray-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-gray-100 px-1 font-mono text-[11px] text-gray-500 dark:bg-white/10 dark:text-gray-400">
                      {literaKolumny(kolumna)}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {naglowki ? tabela[0][kolumna]?.trim() || '(bez nagłówka)' : `Kolumna ${literaKolumny(kolumna)}`}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" title={przyklady.join(' · ')}>
                    {przyklady.length > 0 ? przyklady.join(' · ') : 'pusta'}
                  </p>
                  <select
                    className="input mt-2 text-sm"
                    value={klucz ?? ''}
                    onChange={(e) => zmienMapowanie(kolumna, e.target.value)}
                    aria-label={`Pole dla kolumny ${literaKolumny(kolumna)}`}
                  >
                    <option value="">— pomiń —</option>
                    {pola.map((p) => (
                      <option key={p.klucz} value={p.klucz}>
                        {p.etykieta}
                        {p.wymagane ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  {pole?.format && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{pole.format}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {wiersze.length > 0 && zmapowane.size > 0 && (
        <section className="card mb-6 p-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-3 dark:border-gray-700/60">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">4. Podgląd</h2>
            {!aktualny && !sprawdz.isError && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sprawdzam…
              </span>
            )}
            {wynik && (
              <span className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  {wynik.poprawne} {odmiana(wynik.poprawne, ['poprawny', 'poprawne', 'poprawnych'])}
                </span>
                {zOstrzezeniami > 0 && <> (w tym {zOstrzezeniami} z ostrzeżeniami)</>}
                {wynik.zBledami > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-red-600 dark:text-red-400">{wynik.zBledami} z błędami</span> — zostaną pominięte
                  </>
                )}
              </span>
            )}
            {wynik && (wynik.zBledami > 0 || zOstrzezeniami > 0) && (
              <label className="ml-auto flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                  checked={tylkoUwagi}
                  onChange={(e) => setTylkoUwagi(e.target.checked)}
                />
                Tylko wiersze z uwagami
              </label>
            )}
          </div>
          {sprawdz.isError && (
            <p className="field-error px-5 py-3">
              {sprawdz.error instanceof ApiError ? sprawdz.error.message : 'Nie udało się sprawdzić danych'}
            </p>
          )}
          {wynik && wynik.noweDzialy.length > 0 && (
            <p className="border-b border-gray-100 px-5 py-2 text-xs text-gray-600 dark:border-gray-700/60 dark:text-gray-300">
              Zostaną utworzone działy: <span className="font-medium">{wynik.noweDzialy.join(', ')}</span>
            </p>
          )}
          {wynik && (
            <div className={`overflow-x-auto transition-opacity ${aktualny ? '' : 'opacity-60'}`}>
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="w-12">Wiersz</th>
                    <th className="w-8" />
                    {kolumnyPodgladu.map((p) => (
                      <th key={p.klucz} className="whitespace-nowrap">
                        {p.etykieta}
                      </th>
                    ))}
                    <th className="min-w-[14rem]">Uwagi</th>
                  </tr>
                </thead>
                <tbody>
                  {wierszePodgladu.slice(0, LIMIT_PODGLADU).map((w) => {
                    const uwagi = [
                      ...w.bledy.filter((b) => b.pole === null || !kolumnyPodgladu.some((p) => p.klucz === b.pole)),
                      ...w.ostrzezenia,
                    ];
                    return (
                      <tr key={w.nr} className={w.bledy.length > 0 ? 'bg-red-50/40 dark:bg-red-500/[0.04]' : ''}>
                        <td className="font-mono text-xs text-gray-500 dark:text-gray-400">{w.nr}</td>
                        <td>
                          <StatusWiersza wiersz={w} />
                        </td>
                        {kolumnyPodgladu.map((p) => {
                          const blad = w.bledy.find((b) => b.pole === p.klucz);
                          const ostrzezenie = w.ostrzezenia.some((o) => o.pole === p.klucz);
                          if (blad) {
                            return (
                              <td key={p.klucz} className="min-w-[14rem] bg-red-50 dark:bg-red-500/10">
                                <span className="text-red-700 line-through decoration-red-300 dark:text-red-300">
                                  {surowe.get(w.nr)?.[p.klucz]?.trim() || '—'}
                                </span>
                                <span className="mt-0.5 block text-xs text-red-600 dark:text-red-400">{blad.komunikat}</span>
                              </td>
                            );
                          }
                          return (
                            <td key={p.klucz} className={`whitespace-nowrap ${ostrzezenie ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                              {formatujWartosc(p.klucz, w.wartosci[p.klucz])}
                            </td>
                          );
                        })}
                        <td className="text-xs">
                          {uwagi.map((u, i) => (
                            <p
                              key={i}
                              className={
                                w.bledy.includes(u) ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'
                              }
                            >
                              {u.pole && <span className="font-medium">{etykietaPola(u.pole)}: </span>}
                              {u.komunikat}
                            </p>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {wierszePodgladu.length > LIMIT_PODGLADU && (
                <p className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                  Pokazano {LIMIT_PODGLADU} z {wierszePodgladu.length} wierszy
                  {tylkoUwagi ? '.' : ' — zaznacz „Tylko wiersze z uwagami”, żeby zobaczyć problemy.'}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {wiersze.length > 0 && zmapowane.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200/80 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/80 lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {zapisz.isError && (
              <p className="field-error mr-auto mt-0">
                {zapisz.error instanceof ApiError ? zapisz.error.message : 'Nie udało się zaimportować danych'}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">Przed zapisem aplikacja zrobi kopię zapasową bazy.</p>
            <button
              type="button"
              className="btn-primary"
              disabled={!moznaImportowac}
              onClick={() => zapisz.mutate({ typ, wiersze })}
            >
              {zapisz.isPending
                ? 'Importuję…'
                : wynik && aktualny
                  ? `Importuj ${wynik.poprawne} ${odmiana(wynik.poprawne, TYPY[typ].biernik)}`
                  : 'Importuj'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

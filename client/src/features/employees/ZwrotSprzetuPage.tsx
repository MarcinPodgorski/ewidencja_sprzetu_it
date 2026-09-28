import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS, rodzinaSystemu, type EquipmentType, type SystemOperacyjny } from 'shared';
import { PageHeader } from '../../components/PageHeader';
import { ApiError, apiUrl } from '../../lib/api';
import { odmiana } from '../../lib/odmiana';
import type { Employee, EmployeeEquipmentItem, ZwrotSprzetu } from '../../types/entities';
import { employeesApi } from '../entities';
import { useEmployeeEquipment } from './employees.hooks';
import { useMiscItems, type MiscItem } from './miscItems.hooks';
import { useZapiszZwrot } from './zwroty.hooks';

/** Wiersz tabeli: sprzęt z ewidencji albo pozycja „Różne” — wspólny klucz do zaznaczeń i uwag. */
interface Wiersz {
  klucz: string;
  typ: string;
  identyfikator: string;
  opis: string;
  sprzet?: EmployeeEquipmentItem;
  rozne?: MiscItem;
}

function wierszeZ(sprzet: EmployeeEquipmentItem[] = [], rozne: MiscItem[] = []): Wiersz[] {
  return [
    ...sprzet.map((s) => {
      const typ = s.sprzetTyp as EquipmentType;
      return {
        klucz: `${typ}:${s.id}`,
        typ: EQUIPMENT_TYPE_LABELS[typ],
        identyfikator: String(typ === 'KARTA_SIM' ? s.iccid : s.numerEwidencyjny),
        opis: typ === 'KARTA_SIM' ? String(s.numerTelefonu ?? '') : (s.markaModel ?? ''),
        sprzet: s,
      };
    }),
    ...rozne.map((r) => ({ klucz: `ROZNE:${r.id}`, typ: 'Różne', identyfikator: r.opis, opis: '', rozne: r })),
  ];
}

interface ZadanieKontrolne {
  klucz: string;
  tresc: ReactNode;
}

/** Rzeczy do zrobienia poza aplikacją — zależą od tego, co wróciło i czy pracownik odchodzi. */
function listaKontrolna(pracownik: Employee, zwrocone: Wiersz[], liczbaPozostalych: number, odejscie: boolean): ZadanieKontrolne[] {
  const lista: ZadanieKontrolne[] = [];
  const link = (typ: EquipmentType, id: number, tekst: string) => (
    <Link to={`/${EQUIPMENT_API_SEGMENT[typ]}/${id}`} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
      {tekst}
    </Link>
  );

  if (odejscie) {
    lista.push({
      klucz: 'm365',
      tresc: pracownik.email ? (
        <>
          Zablokuj logowanie do Microsoft 365 (<strong>{pracownik.email}</strong>) i zdecyduj o skrzynce — np. zamień ją na
          skrzynkę współdzieloną albo ustaw przekierowanie poczty.
        </>
      ) : (
        'Zablokuj konto Microsoft 365 pracownika i zdecyduj o jego skrzynce pocztowej.'
      ),
    });
  }
  for (const w of zwrocone) {
    const s = w.sprzet;
    if (!s) continue;
    if (s.sprzetTyp === 'KOMPUTER') {
      const system = (s.systemOperacyjny as SystemOperacyjny | null) ?? null;
      const rodzina = system ? rodzinaSystemu(system) : 'INNY';
      lista.push({
        klucz: w.klucz,
        tresc: (
          <>
            {link('KOMPUTER', s.id, w.identyfikator)}:{' '}
            {rodzina === 'MACOS'
              ? 'zabezpiecz potrzebne dane, wyloguj konto Apple (inaczej blokada aktywacji zablokuje Maca) i wymaż całą zawartość.'
              : rodzina === 'WINDOWS' || system === null
                ? 'zabezpiecz potrzebne dane, przywróć Windows do ustawień fabrycznych, a przed wydaniem kolejnej osobie przygotuj skrypt onboardingu.'
                : 'zabezpiecz potrzebne dane i przygotuj system dla kolejnej osoby (zmiana haseł, czyste konto).'}
          </>
        ),
      });
    } else if (s.sprzetTyp === 'TELEFON') {
      lista.push({
        klucz: w.klucz,
        tresc: (
          <>
            {link('TELEFON', s.id, w.identyfikator)}: wyloguj konto Google/Apple (inaczej blokada przed kradzieżą nie pozwoli go
            skonfigurować) i przywróć ustawienia fabryczne.
          </>
        ),
      });
    } else if (s.sprzetTyp === 'KARTA_SIM') {
      const koniec = typeof s.dataKoncaUmowy === 'string' ? new Date(s.dataKoncaUmowy).toLocaleDateString('pl-PL') : null;
      lista.push({
        klucz: w.klucz,
        tresc: (
          <>
            Karta SIM {link('KARTA_SIM', s.id, String(s.numerTelefonu ?? w.identyfikator))}: przydziel ją komuś innemu albo zawieś
            lub rozwiąż umowę u operatora{koniec ? ` (umowa do ${koniec})` : ''}.
          </>
        ),
      });
    }
  }
  if (odejscie && liczbaPozostalych > 0) {
    lista.push({
      klucz: 'braki',
      tresc: `Nie wszystko wróciło (${liczbaPozostalych} ${odmiana(liczbaPozostalych, ['pozycja', 'pozycje', 'pozycji'])}) — wyjaśnij to z pracownikiem lub kadrami. Lista jest w protokole.`,
    });
  }
  if (odejscie) {
    lista.push({ klucz: 'dostepy', tresc: 'Usuń pracownika z grup, list mailingowych i udostępnionych folderów.' });
  }
  return lista;
}

function Podsumowanie({
  pracownik,
  zwrot,
  zadania,
  dezaktywowano,
}: {
  pracownik: Employee;
  zwrot: ZwrotSprzetu | null;
  zadania: ZadanieKontrolne[];
  dezaktywowano: boolean;
}) {
  const [zrobione, setZrobione] = useState<Set<string>>(new Set());
  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
        {zwrot
          ? `Zapisano zwrot: ${zwrot.pozycje.length} ${odmiana(zwrot.pozycje.length, ['pozycja', 'pozycje', 'pozycji'])}.`
          : 'Zapisano.'}{' '}
        {dezaktywowano && `${pracownik.imie} ${pracownik.nazwisko} jest teraz nieaktywny.`}
      </div>

      {zwrot && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Protokół zwrotu</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Wydrukuj i podpiszcie oboje — zostaje też na karcie pracownika.</p>
          </div>
          <a href={apiUrl(`/employees/${pracownik.id}/zwroty/${zwrot.id}/protokol`)} download className="btn-primary">
            Pobierz protokół (PDF)
          </a>
        </div>
      )}

      {zadania.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Do zrobienia poza aplikacją</h2>
          <ul className="space-y-2.5">
            {zadania.map((z) => (
              <li key={z.klucz}>
                <label className="flex cursor-pointer gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                    checked={zrobione.has(z.klucz)}
                    onChange={() => {
                      const nowe = new Set(zrobione);
                      if (nowe.has(z.klucz)) nowe.delete(z.klucz);
                      else nowe.add(z.klucz);
                      setZrobione(nowe);
                    }}
                  />
                  <span className={zrobione.has(z.klucz) ? 'text-gray-400 line-through dark:text-gray-500' : ''}>{z.tresc}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to={`/employees/${pracownik.id}`} className="btn-secondary">
        Wróć do karty pracownika
      </Link>
    </div>
  );
}

export function ZwrotSprzetuPage() {
  const { id } = useParams();
  const numId = Number(id);
  const [parametry] = useSearchParams();
  const odejscie = parametry.get('odejscie') === '1';

  const { data: pracownik, isLoading } = employeesApi.useDetail(numId);
  const { data: sprzet } = useEmployeeEquipment(numId);
  const { data: rozne } = useMiscItems(numId);
  const zapisz = useZapiszZwrot(numId);

  const [zaznaczone, setZaznaczone] = useState<Set<string>>(new Set());
  const [uwagi, setUwagi] = useState<Record<string, string>>({});
  const [dezaktywuj, setDezaktywuj] = useState(odejscie);
  const [notatka, setNotatka] = useState('');
  const [blad, setBlad] = useState<string | null>(null);
  const [wynik, setWynik] = useState<{ zwrot: ZwrotSprzetu | null; zadania: ZadanieKontrolne[]; dezaktywowano: boolean } | null>(
    null,
  );

  const wiersze = useMemo(() => wierszeZ(sprzet, rozne), [sprzet, rozne]);

  if (isLoading || !sprzet || !rozne) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  if (!pracownik) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono pracownika.</div>;
  }

  const imieNazwisko = `${pracownik.imie} ${pracownik.nazwisko}`;
  const tytul = odejscie ? `Odejście pracownika: ${imieNazwisko}` : `Zwrot sprzętu: ${imieNazwisko}`;

  if (wynik) {
    return (
      <div>
        <PageHeader title={tytul} backTo={`/employees/${pracownik.id}`} />
        <Podsumowanie pracownik={pracownik} zwrot={wynik.zwrot} zadania={wynik.zadania} dezaktywowano={wynik.dezaktywowano} />
      </div>
    );
  }

  const wszystkieZaznaczone = wiersze.length > 0 && zaznaczone.size === wiersze.length;
  const niezwrocone = wiersze.length - zaznaczone.size;

  function przelacz(klucz: string) {
    const nowe = new Set(zaznaczone);
    if (nowe.has(klucz)) nowe.delete(klucz);
    else nowe.add(klucz);
    setZaznaczone(nowe);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pracownik) return;
    setBlad(null);
    const zwrocone = wiersze.filter((w) => zaznaczone.has(w.klucz));
    const uwagaDo = (w: Wiersz) => uwagi[w.klucz]?.trim() || null;
    try {
      const zwrot = await zapisz.mutateAsync({
        pozycje: zwrocone.flatMap((w) =>
          w.sprzet ? [{ sprzetTyp: w.sprzet.sprzetTyp as EquipmentType, sprzetId: w.sprzet.id, uwagi: uwagaDo(w) }] : [],
        ),
        rozne: zwrocone.flatMap((w) => (w.rozne ? [{ id: w.rozne.id, uwagi: uwagaDo(w) }] : [])),
        odejscie,
        dezaktywuj: pracownik.aktywny && dezaktywuj,
        notatka: notatka.trim() || null,
      });
      setWynik({
        zwrot,
        zadania: listaKontrolna(pracownik, zwrocone, wiersze.length - zwrocone.length, odejscie),
        dezaktywowano: pracownik.aktywny && dezaktywuj,
      });
    } catch (err) {
      setBlad(err instanceof ApiError ? err.message : 'Nie udało się zapisać zwrotu');
    }
  }

  const moznaZapisac = zaznaczone.size > 0 || (pracownik.aktywny && dezaktywuj);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={tytul}
        subtitle={[pracownik.stanowisko, pracownik.dzial?.nazwa].filter(Boolean).join(' · ')}
        backTo={`/employees/${pracownik.id}`}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700/60">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Co wraca?</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Zaznacz zwracane pozycje. Stan albo uwagi (np. „porysowana obudowa”) trafią do protokołu.
              </p>
            </div>
            {wiersze.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setZaznaczone(wszystkieZaznaczone ? new Set() : new Set(wiersze.map((w) => w.klucz)))}
              >
                {wszystkieZaznaczone ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
              </button>
            )}
          </div>
          {wiersze.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Pracownik nie ma przypisanego sprzętu ani pozycji „Różne”.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th className="w-10" />
                    <th>Typ</th>
                    <th>Identyfikator</th>
                    <th>Marka/model</th>
                    <th className="min-w-[14rem]">Stan / uwagi</th>
                  </tr>
                </thead>
                <tbody>
                  {wiersze.map((w) => (
                    <tr key={w.klucz} className="cursor-pointer" onClick={() => przelacz(w.klucz)}>
                      <td>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                          checked={zaznaczone.has(w.klucz)}
                          onChange={() => przelacz(w.klucz)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Zwrócone: ${w.typ} ${w.identyfikator}`}
                        />
                      </td>
                      <td className="whitespace-nowrap">{w.typ}</td>
                      <td className="font-medium">{w.identyfikator}</td>
                      <td>{w.opis || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          className="input py-1.5"
                          value={uwagi[w.klucz] ?? ''}
                          maxLength={300}
                          disabled={!zaznaczone.has(w.klucz)}
                          placeholder={zaznaczone.has(w.klucz) ? 'bez uwag' : ''}
                          onChange={(e) => setUwagi({ ...uwagi, [w.klucz]: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          {pracownik.aktywny && (
            <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                checked={dezaktywuj}
                onChange={(e) => setDezaktywuj(e.target.checked)}
              />
              <span>
                <strong className="font-medium text-gray-900 dark:text-gray-100">Dezaktywuj pracownika po zapisaniu</strong>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Zniknie z list wyboru przy przypisywaniu sprzętu. Historia i protokoły zostają.
                </span>
              </span>
            </label>
          )}
          {odejscie && niezwrocone > 0 && wiersze.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {niezwrocone} {odmiana(niezwrocone, ['pozycja zostanie', 'pozycje zostaną', 'pozycji zostanie'])} przy pracowniku —
              w protokole {niezwrocone === 1 ? 'trafi' : 'trafią'} do sekcji „Sprzęt niezwrócony”.
            </p>
          )}
          <div>
            <label className="label" htmlFor="notatka">
              Notatka do protokołu
            </label>
            <textarea
              id="notatka"
              rows={2}
              className="input"
              maxLength={1000}
              value={notatka}
              onChange={(e) => setNotatka(e.target.value)}
              placeholder={odejscie ? 'np. ostatni dzień pracy: 30.09' : 'np. wymiana na nowszy laptop'}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {blad && <p className="field-error mr-auto mt-0">{blad}</p>}
          <Link to={`/employees/${pracownik.id}`} className="btn-secondary">
            Anuluj
          </Link>
          <button type="submit" className={odejscie ? 'btn-danger' : 'btn-primary'} disabled={!moznaZapisac || zapisz.isPending}>
            {zapisz.isPending
              ? 'Zapisywanie…'
              : zaznaczone.size > 0
                ? `Zapisz zwrot (${zaznaczone.size} ${odmiana(zaznaczone.size, ['pozycja', 'pozycje', 'pozycji'])})`
                : pracownik.aktywny && dezaktywuj
                  ? 'Dezaktywuj bez zwrotu'
                  : 'Zaznacz pozycje do zwrotu'}
          </button>
        </div>
      </form>
    </div>
  );
}

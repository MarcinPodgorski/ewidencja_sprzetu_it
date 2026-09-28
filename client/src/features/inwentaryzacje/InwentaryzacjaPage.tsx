import { Fragment, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS } from 'shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { ApiError, api, apiUrl } from '../../lib/api';
import type { InwentaryzacjaPozycja, WynikSkanu } from '../../types/entities';
import { formatujDate } from '../onboarding/utils';
import {
  useCofnijPotwierdzenie,
  useDodajZnaleziony,
  useInwentaryzacja,
  usePotwierdzPozycje,
  useUsunInwentaryzacje,
  useZamknijInwentaryzacje,
} from './inwentaryzacje.hooks';
import { PasekPostepu, StatusInwentaryzacjiBadge, numerZKodu } from './utils';

type Filtr = 'wszystkie' | 'brakujace' | 'potwierdzone' | 'spoza';

const FILTRY: { wartosc: Filtr; etykieta: string; pasuje: (p: InwentaryzacjaPozycja) => boolean }[] = [
  { wartosc: 'wszystkie', etykieta: 'Wszystkie', pasuje: () => true },
  { wartosc: 'brakujace', etykieta: 'Brakujące', pasuje: (p) => !p.potwierdzonoAt && !p.spozaListy },
  { wartosc: 'potwierdzone', etykieta: 'Potwierdzone', pasuje: (p) => Boolean(p.potwierdzonoAt) && !p.spozaListy },
  { wartosc: 'spoza', etykieta: 'Spoza listy', pasuje: (p) => p.spozaListy },
];

interface Komunikat {
  rodzaj: 'ok' | 'uwaga' | 'blad';
  tekst: string;
}

const KOLORY_KOMUNIKATU: Record<Komunikat['rodzaj'], string> = {
  ok: 'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300',
  uwaga: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300',
  blad: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

export function InwentaryzacjaPage() {
  const { id } = useParams();
  const numId = Number(id);
  const navigate = useNavigate();
  const { data: inw, isLoading, isError } = useInwentaryzacja(numId);
  const potwierdz = usePotwierdzPozycje();
  const cofnij = useCofnijPotwierdzenie();
  const dodajZnaleziony = useDodajZnaleziony();
  const zamknij = useZamknijInwentaryzacje();
  const usun = useUsunInwentaryzacje();

  const [filtr, setFiltr] = useState<Filtr>('wszystkie');
  const [wpis, setWpis] = useState('');
  const [komunikat, setKomunikat] = useState<Komunikat | null>(null);
  const [pytanie, setPytanie] = useState<'zamknij' | 'usun' | null>(null);
  const poleRef = useRef<HTMLInputElement>(null);

  const grupy = useMemo(() => {
    const pasuje = FILTRY.find((f) => f.wartosc === filtr)!.pasuje;
    const mapa = new Map<string, InwentaryzacjaPozycja[]>();
    for (const p of inw?.pozycje ?? []) {
      if (!pasuje(p)) continue;
      const klucz = p.dzial ?? 'Bez działu';
      mapa.set(klucz, [...(mapa.get(klucz) ?? []), p]);
    }
    return [...mapa.entries()];
  }, [inw, filtr]);

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  if (isError || !inw) {
    return <div className="card text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono tej inwentaryzacji.</div>;
  }

  const otwarta = inw.status === 'OTWARTA';
  const zListy = inw.pozycje.filter((p) => !p.spozaListy);
  const potwierdzone = zListy.filter((p) => p.potwierdzonoAt).length;
  const spozaListy = inw.pozycje.length - zListy.length;
  const zajete = potwierdz.isPending || cofnij.isPending || dodajZnaleziony.isPending;

  /** Numer wpisany ręcznie albo z czytnika: potwierdza pozycję z listy, a sprzęt spoza
   *  listy (znaleziony np. w innym dziale) dopisuje jako „znaleziony spoza listy”. */
  async function onSkan(e: FormEvent) {
    e.preventDefault();
    if (!inw) return;
    const numer = numerZKodu(wpis);
    setWpis('');
    poleRef.current?.focus();
    if (!numer) return;
    try {
      const pozycja = inw.pozycje.find((p) => p.identyfikator.toUpperCase() === numer.toUpperCase());
      if (pozycja) {
        if (pozycja.potwierdzonoAt) {
          setKomunikat({ rodzaj: 'uwaga', tekst: `${pozycja.identyfikator} był już potwierdzony (${formatujDate(pozycja.potwierdzonoAt)}).` });
          return;
        }
        await potwierdz.mutateAsync({ inwentaryzacjaId: inw.id, pozycjaId: pozycja.id });
        setKomunikat({ rodzaj: 'ok', tekst: `Potwierdzono ${pozycja.identyfikator}${pozycja.opis ? ` — ${pozycja.opis}` : ''}.` });
        return;
      }
      const { items } = await api.get<{ items: WynikSkanu[] }>(`/inwentaryzacje/skan/${encodeURIComponent(numer)}`);
      if (items.length === 0) {
        setKomunikat({ rodzaj: 'blad', tekst: `W ewidencji nie ma sprzętu o numerze „${numer}”.` });
        return;
      }
      const sprzet = items[0];
      await dodajZnaleziony.mutateAsync({ inwentaryzacjaId: inw.id, sprzetTyp: sprzet.sprzetTyp, sprzetId: sprzet.sprzetId });
      setKomunikat({ rodzaj: 'uwaga', tekst: `${sprzet.identyfikator} nie było na liście — dopisano jako znaleziony spoza listy.` });
    } catch (err) {
      setKomunikat({ rodzaj: 'blad', tekst: err instanceof ApiError ? err.message : 'Nie udało się potwierdzić' });
    }
  }

  function przelacz(p: InwentaryzacjaPozycja) {
    if (!inw || !otwarta) return;
    const dane = { inwentaryzacjaId: inw.id, pozycjaId: p.id };
    if (p.potwierdzonoAt) cofnij.mutate(dane);
    else potwierdz.mutate(dane);
  }

  return (
    <div>
      <PageHeader
        title={inw.nazwa}
        subtitle={[
          inw.dzial ? `sprzęt pracowników działu ${inw.dzial.nazwa}` : 'cała firma',
          `rozpoczęta ${formatujDate(inw.createdAt)}`,
          inw.zamknietaAt && `zamknięta ${formatujDate(inw.zamknietaAt)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        backTo="/inwentaryzacje"
        actions={
          <>
            <a href={apiUrl(`/inwentaryzacje/${inw.id}/raport`)} download className="btn-secondary">
              Raport PDF
            </a>
            {otwarta && (
              <button type="button" className="btn-primary" onClick={() => setPytanie('zamknij')}>
                Zamknij spis
              </button>
            )}
            <button type="button" className="btn-danger" onClick={() => setPytanie('usun')}>
              Usuń
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Postęp</h2>
            <StatusInwentaryzacjiBadge status={inw.status} />
          </div>
          <PasekPostepu potwierdzone={potwierdzone} wszystkie={zListy.length} spozaListy={spozaListy} />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Brakuje: <strong className="text-gray-900 dark:text-gray-100">{zListy.length - potwierdzone}</strong>
          </p>
        </div>

        {otwarta ? (
          <div className="card lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Potwierdzanie</h2>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Telefonem: zeskanuj naklejkę aparatem — otworzy się strona z przyciskiem „Potwierdź”. Tutaj: wpisz numer albo użyj
              czytnika kodów i naciśnij Enter.
            </p>
            <form onSubmit={onSkan} className="flex gap-2">
              <input
                ref={poleRef}
                className="input font-mono"
                placeholder="np. KOMP-001 albo zeskanowany kod"
                value={wpis}
                onChange={(e) => setWpis(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary shrink-0" disabled={zajete || !wpis.trim()}>
                Potwierdź
              </button>
            </form>
            {komunikat && <p className={`mt-3 rounded-md px-3 py-2 text-sm ${KOLORY_KOMUNIKATU[komunikat.rodzaj]}`}>{komunikat.tekst}</p>}
          </div>
        ) : (
          <div className="card text-sm text-gray-500 dark:text-gray-400 lg:col-span-2">
            Spis jest zamknięty — potwierdzenia nie są już przyjmowane. Wynik znajdziesz w raporcie PDF.
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTRY.map((f) => {
          const ile = inw.pozycje.filter(f.pasuje).length;
          if (f.wartosc === 'spoza' && ile === 0) return null;
          return (
            <button
              key={f.wartosc}
              type="button"
              onClick={() => setFiltr(f.wartosc)}
              className={
                filtr === f.wartosc
                  ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white'
                  : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }
            >
              {f.etykieta} ({ile})
            </button>
          );
        })}
      </div>

      {grupy.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          {filtr === 'brakujace' ? 'Nic nie brakuje — wszystko potwierdzone.' : 'Brak pozycji.'}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Nr ewidencyjny</th>
                <th>Typ</th>
                <th>Marka/model</th>
                <th>Użytkownik / lokalizacja</th>
                <th>Potwierdzono</th>
              </tr>
            </thead>
            <tbody>
              {grupy.map(([dzial, lista]) => (
                <Fragment key={dzial}>
                  <tr>
                    <td colSpan={6} className="bg-gray-50/80 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      {dzial}{' '}
                      <span className="font-normal normal-case tracking-normal">
                        ({lista.filter((p) => p.potwierdzonoAt).length}/{lista.length})
                      </span>
                    </td>
                  </tr>
                  {lista.map((p) => (
                    <tr key={p.id} className={otwarta ? 'cursor-pointer' : ''} onClick={() => przelacz(p)}>
                      <td>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-green-600 dark:border-gray-600 dark:bg-gray-800"
                          checked={Boolean(p.potwierdzonoAt)}
                          disabled={!otwarta || zajete}
                          onChange={() => przelacz(p)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Potwierdzony: ${p.identyfikator}`}
                        />
                      </td>
                      <td className="whitespace-nowrap">
                        <Link
                          to={`/${EQUIPMENT_API_SEGMENT[p.sprzetTyp]}/${p.sprzetId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          {p.identyfikator}
                        </Link>
                        {p.spozaListy && (
                          <span className="badge ml-2 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">spoza listy</span>
                        )}
                      </td>
                      <td>{EQUIPMENT_TYPE_LABELS[p.sprzetTyp]}</td>
                      <td>{p.opis ?? '—'}</td>
                      <td className="text-gray-500 dark:text-gray-400">{p.uzytkownik ?? '—'}</td>
                      <td className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {p.potwierdzonoAt ? (
                          <>
                            <span className="text-green-700 dark:text-green-400">{formatujDate(p.potwierdzonoAt)}</span>
                            {p.potwierdzilAppUser && ` · ${p.potwierdzilAppUser.login}`}
                            {p.uwagi && <span className="block text-gray-400">{p.uwagi}</span>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pytanie === 'zamknij'}
        title="Zamknąć inwentaryzację?"
        description={`Potwierdzono ${potwierdzone} z ${zListy.length} pozycji. Po zamknięciu nie da się dodawać potwierdzeń — zostaje raport.`}
        confirmLabel="Zamknij spis"
        busy={zamknij.isPending}
        onConfirm={() => zamknij.mutate(inw.id, { onSuccess: () => setPytanie(null) })}
        onCancel={() => setPytanie(null)}
      />
      <ConfirmDialog
        open={pytanie === 'usun'}
        title="Usunąć inwentaryzację?"
        description="Lista i wszystkie potwierdzenia zostaną usunięte bez możliwości przywrócenia. Sprzęt w ewidencji się nie zmieni."
        confirmLabel="Usuń"
        danger
        busy={usun.isPending}
        onConfirm={() => usun.mutate(inw.id, { onSuccess: () => navigate('/inwentaryzacje') })}
        onCancel={() => setPytanie(null)}
      />
    </div>
  );
}

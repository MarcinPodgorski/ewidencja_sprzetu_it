import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { EQUIPMENT_API_SEGMENT, EQUIPMENT_TYPE_LABELS } from 'shared';
import { Backdrop } from '../../components/Backdrop';
import type { WynikSkanu } from '../../types/entities';
import { formatujDate } from '../onboarding/utils';
import { useCofnijPotwierdzenie, useDodajZnaleziony, usePotwierdzPozycje, useSkan } from './inwentaryzacje.hooks';

/** Karta sprzętu po zeskanowaniu naklejki — duże przyciski pod kciuk (telefon w ręku). */
function KartaSprzetu({ sprzet }: { sprzet: WynikSkanu }) {
  const potwierdz = usePotwierdzPozycje();
  const cofnij = useCofnijPotwierdzenie();
  const dodaj = useDodajZnaleziony();
  const zajete = potwierdz.isPending || cofnij.isPending || dodaj.isPending;
  const adresKarty = `/${EQUIPMENT_API_SEGMENT[sprzet.sprzetTyp]}/${sprzet.sprzetId}`;

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {EQUIPMENT_TYPE_LABELS[sprzet.sprzetTyp]}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{sprzet.identyfikator}</h1>
        {sprzet.opis && <p className="text-gray-600 dark:text-gray-300">{sprzet.opis}</p>}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {sprzet.uzytkownik ?? 'nieprzypisany'}
          {sprzet.sprzetTyp !== 'DRUKARKA' && sprzet.dzial && sprzet.uzytkownik && ` · ${sprzet.dzial}`}
        </p>
        {sprzet.wycofany && (
          <p className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Ten sprzęt jest wycofany z ewidencji.
          </p>
        )}
      </div>

      {sprzet.inwentaryzacje.map((inw) => (
        <div key={inw.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-700/60">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {inw.nazwa}
            {inw.dzial && <span className="font-normal text-gray-400"> · dział {inw.dzial}</span>}
          </p>
          {inw.pozycja?.potwierdzonoAt ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-green-700 dark:text-green-400">
                <span className="text-lg">✓</span> Potwierdzono {formatujDate(inw.pozycja.potwierdzonoAt)}
                {inw.pozycja.potwierdzilAppUser && ` (${inw.pozycja.potwierdzilAppUser.login})`}
              </p>
              <button
                type="button"
                className="text-sm font-medium text-gray-500 underline dark:text-gray-400"
                disabled={zajete}
                onClick={() => cofnij.mutate({ inwentaryzacjaId: inw.id, pozycjaId: inw.pozycja!.id })}
              >
                cofnij
              </button>
            </div>
          ) : inw.pozycja ? (
            <button
              type="button"
              className="btn-primary w-full py-4 text-lg"
              disabled={zajete}
              onClick={() => potwierdz.mutate({ inwentaryzacjaId: inw.id, pozycjaId: inw.pozycja!.id })}
            >
              {potwierdz.isPending ? 'Potwierdzanie…' : 'Potwierdź obecność'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Tego sprzętu nie ma na liście tej inwentaryzacji (np. jest przypisany do innego działu).
              </p>
              <button
                type="button"
                className="btn-secondary w-full py-3"
                disabled={zajete}
                onClick={() => dodaj.mutate({ inwentaryzacjaId: inw.id, sprzetTyp: sprzet.sprzetTyp, sprzetId: sprzet.sprzetId })}
              >
                Dodaj jako znaleziony spoza listy
              </button>
            </div>
          )}
        </div>
      ))}

      <Link to={adresKarty} className="block text-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
        Otwórz pełną kartę sprzętu
      </Link>
    </div>
  );
}

/**
 * Strona otwierana skanem naklejki QR (…/sprzet/q/<numer ewidencyjny>). Bez paska bocznego —
 * ma być wygodna na telefonie. Gdy żadna inwentaryzacja nie trwa, od razu przechodzi do karty sprzętu.
 */
export function SkanPage() {
  const { numer = '' } = useParams();
  const { data: wyniki, isLoading, isError } = useSkan(numer);

  useEffect(() => {
    document.title = `${numer} — Ewidencja sprzętu`;
  }, [numer]);

  const jedenBezSpisu = wyniki?.length === 1 && wyniki[0].inwentaryzacje.length === 0;
  if (jedenBezSpisu) {
    const s = wyniki[0];
    return <Navigate to={`/${EQUIPMENT_API_SEGMENT[s.sprzetTyp]}/${s.sprzetId}`} replace />;
  }

  return (
    <div className="relative isolate min-h-screen px-4 py-6">
      <Backdrop />
      <div className="mx-auto max-w-md space-y-4">
        <Link to="/" className="block text-center text-sm font-semibold text-gray-500 dark:text-gray-400">
          Ewidencja sprzętu
        </Link>
        {isLoading ? (
          <div className="card text-center text-gray-500 dark:text-gray-400">Szukam „{numer}”…</div>
        ) : isError ? (
          <div className="card text-center text-red-600 dark:text-red-400">Nie udało się sprawdzić tego kodu.</div>
        ) : !wyniki || wyniki.length === 0 ? (
          <div className="card space-y-2 text-center">
            <p className="text-gray-900 dark:text-gray-100">
              W ewidencji nie ma sprzętu o numerze <strong className="font-mono">{numer}</strong>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Naklejka mogła zostać wydrukowana dla sprzętu, który usunięto.</p>
          </div>
        ) : (
          wyniki.map((s) => <KartaSprzetu key={`${s.sprzetTyp}-${s.sprzetId}`} sprzet={s} />)
        )}
      </div>
    </div>
  );
}

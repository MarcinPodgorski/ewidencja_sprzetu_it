import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { ApiError, apiUrl } from '../../lib/api';
import { formatujDate, formatujRozmiar } from '../onboarding/utils';
import { useKopie, useUtworzKopie, type KopiaZapasowa } from './kopie.hooks';

/** Kopie w wolumenie z docker-compose.yml (`sprzet-it-dane`) widziane z maszyny, na której działa Docker. */
const KATALOG_KOPII_DOCKER = '/var/lib/docker/volumes/sprzet-it-dane/_data/backups';

const RODZAJE_KOPII: Record<KopiaZapasowa['rodzaj'], string> = {
  AUTOMATYCZNA: 'automatyczna',
  RECZNA: 'ręczna',
  PRZED_IMPORTEM: 'przed importem',
};

function Polecenie({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-gray-900 px-4 py-3 font-mono text-xs leading-relaxed text-green-300 dark:bg-black">
      {children}
    </pre>
  );
}

export function KopiePage() {
  const { data, isLoading } = useKopie();
  const utworz = useUtworzKopie();
  const [blad, setBlad] = useState<string | null>(null);

  if (isLoading || !data) return <div className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>;
  const { stan, items: kopie } = data;
  const przykladowa = kopie[0]?.nazwa ?? 'RRRR-MM-DD_GG-MM-SS';

  async function utworzTeraz() {
    setBlad(null);
    try {
      await utworz.mutateAsync();
    } catch (err) {
      setBlad(err instanceof ApiError ? err.message : 'Nie udało się utworzyć kopii');
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Kopie zapasowe"
        subtitle="Baza danych, załączniki faktur i instalatory — kopia spójna nawet w trakcie pracy aplikacji"
        actions={
          <button type="button" className="btn-primary" disabled={utworz.isPending || stan.trwa} onClick={utworzTeraz}>
            {utworz.isPending || stan.trwa ? 'Tworzenie kopii…' : 'Utwórz kopię teraz'}
          </button>
        }
      />

      {blad && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{blad}</div>}
      {stan.ostatniBlad && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Ostatnia próba ({formatujDate(stan.ostatniBlad.kiedy)}) nie powiodła się: {stan.ostatniBlad.komunikat}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Ostatnia kopia</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stan.ostatnia ? formatujDate(stan.ostatnia.utworzono) : 'brak'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Automatycznie</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stan.automatyczne ? `codziennie o ${stan.godzina}:00` : 'wyłączone'}
          </p>
          {stan.nastepna && <p className="text-xs text-gray-500 dark:text-gray-400">następna: {formatujDate(stan.nastepna)}</p>}
        </div>
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Przechowywanie</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{stan.retencjaDni} dni</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">trzy najnowsze kopie zostają zawsze</p>
        </div>
      </div>

      {!stan.automatyczne && (
        <div className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Automatyczne kopie są wyłączone — włącza je <code className="font-mono">BACKUP_AUTO=true</code> w konfiguracji serwera
          (w produkcji domyślnie włączone).
        </div>
      )}

      <div className="card mb-6 overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Utworzono</th>
              <th>Rodzaj</th>
              <th>Baza</th>
              <th>Pliki</th>
              <th className="text-right">Pobierz</th>
            </tr>
          </thead>
          <tbody>
            {kopie.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400">
                  Nie ma jeszcze żadnej kopii.
                </td>
              </tr>
            ) : (
              kopie.map((k) => (
                <tr key={k.nazwa}>
                  <td className="whitespace-nowrap font-medium">{formatujDate(k.utworzono)}</td>
                  <td>{RODZAJE_KOPII[k.rodzaj]}</td>
                  <td>{formatujRozmiar(k.rozmiarBazy)}</td>
                  <td>{k.liczbaPlikow > 0 ? `${k.liczbaPlikow} (${formatujRozmiar(k.rozmiarPlikow)})` : '—'}</td>
                  <td className="whitespace-nowrap text-right text-xs">
                    <a href={apiUrl(`/kopie/${k.nazwa}/baza`)} download className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                      baza (.db)
                    </a>
                    <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
                    <a href={apiUrl(`/kopie/${k.nazwa}/calosc`)} download className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                      całość (.tar.gz)
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Przywracanie</h2>
          {stan.docker ? (
            <>
              <p>W katalogu z <code className="font-mono">docker-compose.yml</code> zatrzymaj kontener, podmień bazę i pliki z wybranej kopii, uruchom ponownie:</p>
              <Polecenie>{[
                'docker compose stop sprzet-it',
                `docker compose run --rm --entrypoint sh sprzet-it -c 'K=${stan.katalog}/${przykladowa} && \\`,
                `  cp $K/baza.db ${stan.sciezkaBazy} && rm -f ${stan.sciezkaBazy}-wal ${stan.sciezkaBazy}-shm && \\`,
                `  rm -rf ${stan.katalogUploads} && cp -a $K/uploads ${stan.katalogUploads}'`,
                'docker compose start sprzet-it',
              ].join('\n')}</Polecenie>
            </>
          ) : (
            <>
              <p>Na serwerze zatrzymaj aplikację, podmień bazę i pliki z wybranej kopii, uruchom ponownie:</p>
              <Polecenie>{[
                'pm2 stop sprzet-it',
                `cp ${stan.katalog}/${przykladowa}/baza.db ${stan.sciezkaBazy}`,
                `rm -f ${stan.sciezkaBazy}-wal ${stan.sciezkaBazy}-shm`,
                `rsync -a --delete ${stan.katalog}/${przykladowa}/uploads/ ${stan.katalogUploads}/`,
                'pm2 start sprzet-it',
              ].join('\n')}</Polecenie>
            </>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pliki <code className="font-mono">-wal</code> i <code className="font-mono">-shm</code> należą do starej bazy — bez ich
            usunięcia SQLite mógłby dołożyć do przywróconej kopii niezapisane zmiany.
          </p>
        </div>
        <div className="card space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Kopia poza serwerem</h2>
          {stan.docker ? (
            <>
              <p>
                Kopie leżą w wolumenie Dockera na tej samej maszynie (<code className="break-all font-mono text-xs">{KATALOG_KOPII_DOCKER}</code>) —
                nie uchronią przed awarią dysku. Włącz kopie całej maszyny w Proxmoxie albo kopiuj katalog na NAS, codziennie po{' '}
                {stan.godzina}:00 (cron na maszynie z Dockerem, jako root):
              </p>
              <Polecenie>{`30 ${stan.godzina} * * *  rsync -a --delete ${KATALOG_KOPII_DOCKER}/ nas:/kopie/sprzet-it/`}</Polecenie>
            </>
          ) : (
            <>
              <p>
                Kopie leżą na tym samym serwerze co aplikacja (<code className="break-all font-mono text-xs">{stan.katalog}</code>) — nie
                uchronią przed awarią dysku. Kopiuj je dodatkowo np. na NAS, codziennie po {stan.godzina}:00:
              </p>
              <Polecenie>{`30 ${stan.godzina} * * *  rsync -a --delete ${stan.katalog}/ nas:/kopie/sprzet-it/`}</Polecenie>
            </>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kopie zawierają całą bazę, także PIN-y kart SIM — trzymaj je tylko tam, gdzie dostęp ma dział IT.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import {
  INSTALATOR_ROZSZERZENIA,
  OPROGRAMOWANIE_ZRODLO_LABELS,
  oprogramowanieCreateSchema,
  type OprogramowanieZrodlo,
} from 'shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError, apiUrl } from '../../lib/api';
import type { Oprogramowanie } from '../../types/entities';
import { oprogramowanieApi } from '../entities';
import { useZapiszInstalator } from './onboarding.hooks';
import { formatujRozmiar } from './utils';

interface Formularz {
  zrodlo: OprogramowanieZrodlo;
  nazwa: string;
  wingetId: string;
  argumenty: string;
  opis: string;
}

const PUSTY_FORMULARZ: Formularz = { zrodlo: 'WINGET', nazwa: '', wingetId: '', argumenty: '', opis: '' };

const rozszerzenie = (nazwa: string) => nazwa.slice(nazwa.lastIndexOf('.')).toLowerCase();

/** Katalog programów: pakiety winget i wgrane pliki instalacyjne (np. instalator ESET). */
export function KatalogOprogramowaniaCard() {
  const { data: programy, isLoading } = oprogramowanieApi.useList();
  const createMutation = oprogramowanieApi.useCreate();
  const updateMutation = oprogramowanieApi.useUpdate();
  const deleteMutation = oprogramowanieApi.useArchive();
  const zapiszInstalator = useZapiszInstalator();

  const [edytowany, setEdytowany] = useState<Oprogramowanie | null>(null);
  const [formularz, setFormularz] = useState<Formularz>(PUSTY_FORMULARZ);
  const [plik, setPlik] = useState<File | null>(null);
  const [blad, setBlad] = useState<string | null>(null);
  const [doUsuniecia, setDoUsuniecia] = useState<Oprogramowanie | null>(null);
  const plikRef = useRef<HTMLInputElement>(null);

  function ustaw(zmiany: Partial<Formularz>) {
    setFormularz((prev) => ({ ...prev, ...zmiany }));
  }

  function wyczyscPlik() {
    setPlik(null);
    if (plikRef.current) plikRef.current.value = '';
  }

  function edytuj(program: Oprogramowanie) {
    setEdytowany(program);
    setFormularz({
      zrodlo: program.zrodlo,
      nazwa: program.nazwa,
      wingetId: program.wingetId ?? '',
      argumenty: program.argumenty ?? '',
      opis: program.opis ?? '',
    });
    wyczyscPlik();
    setBlad(null);
  }

  function anuluj() {
    setEdytowany(null);
    setFormularz(PUSTY_FORMULARZ);
    wyczyscPlik();
    setBlad(null);
  }

  function wybierzPlik(wybrany: File | null) {
    setPlik(wybrany);
    if (!wybrany) return;
    // Podpowiedzi: nazwa z pliku i standardowe parametry cichej instalacji MSI.
    ustaw({
      nazwa: formularz.nazwa || wybrany.name.replace(/\.[^.]+$/, ''),
      argumenty: formularz.argumenty || (rozszerzenie(wybrany.name) === '.msi' ? '/qn /norestart' : ''),
    });
  }

  function obsluzBlad(err: Error) {
    setBlad(err instanceof ApiError && err.status === 409 ? 'Program z tym ID winget już jest w katalogu' : err.message);
  }

  function zapisz() {
    setBlad(null);
    if (formularz.zrodlo === 'WINGET') {
      const wynik = oprogramowanieCreateSchema.safeParse({
        zrodlo: 'WINGET',
        nazwa: formularz.nazwa,
        wingetId: formularz.wingetId,
        opis: formularz.opis,
      });
      if (!wynik.success) return setBlad(wynik.error.issues[0]?.message ?? 'Nieprawidłowe dane');
      if (edytowany) updateMutation.mutate({ id: edytowany.id, data: wynik.data }, { onSuccess: anuluj, onError: obsluzBlad });
      else createMutation.mutate(wynik.data, { onSuccess: anuluj, onError: obsluzBlad });
      return;
    }

    if (!formularz.nazwa.trim()) return setBlad('Nazwa jest wymagana');
    if (!edytowany && !plik) return setBlad('Wybierz plik instalacyjny');
    if (plik && !(INSTALATOR_ROZSZERZENIA as readonly string[]).includes(rozszerzenie(plik.name))) {
      return setBlad(`Obsługiwane instalatory: ${INSTALATOR_ROZSZERZENIA.join(', ')}`);
    }
    const formData = new FormData();
    if (!edytowany) formData.set('zrodlo', 'PLIK');
    formData.set('nazwa', formularz.nazwa);
    formData.set('argumenty', formularz.argumenty);
    formData.set('opis', formularz.opis);
    if (plik) formData.set('plik', plik);
    zapiszInstalator.mutate({ id: edytowany?.id, formData }, { onSuccess: anuluj, onError: obsluzBlad });
  }

  const zapisywanie = createMutation.isPending || updateMutation.isPending || zapiszInstalator.isPending;
  const zrodlo = formularz.zrodlo;

  return (
    <div className="card">
      <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Katalog oprogramowania</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Pakiety z winget (ID znajdziesz poleceniem <code>winget search nazwa</code>) albo własne pliki instalacyjne, np.
        instalator z konsoli antywirusa.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
      ) : programy && programy.length > 0 ? (
        <div className="-mx-5 mb-4 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Źródło</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {programy.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.nazwa}
                    {p.opis && <span className="block text-xs text-gray-500 dark:text-gray-400">{p.opis}</span>}
                  </td>
                  <td>
                    {p.zrodlo === 'WINGET' ? (
                      <code className="text-xs">{p.wingetId}</code>
                    ) : (
                      <span className="text-xs">
                        <span className="badge mr-1.5 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">plik</span>
                        {p.plikNazwa}
                        {p.plikRozmiar !== null && (
                          <span className="text-gray-500 dark:text-gray-400"> · {formatujRozmiar(p.plikRozmiar)}</span>
                        )}
                        {p.argumenty && (
                          <code className="mt-0.5 block text-gray-500 dark:text-gray-400">{p.argumenty}</code>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {p.maPlik && (
                      <a
                        href={apiUrl(`/oprogramowanie/${p.id}/plik`)}
                        download
                        className="mr-3 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        pobierz
                      </a>
                    )}
                    <button
                      type="button"
                      className="mr-3 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      onClick={() => edytuj(p)}
                    >
                      edytuj
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                      onClick={() => setDoUsuniecia(p)}
                    >
                      usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Katalog jest pusty.</p>
      )}

      <div className="space-y-3 rounded-md border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {edytowany ? `Edycja: ${edytowany.nazwa}` : 'Nowy program'}
          </p>
          <div className="flex gap-1.5">
            {(['WINGET', 'PLIK'] as const).map((z) => (
              <button
                key={z}
                type="button"
                disabled={edytowany !== null && edytowany.zrodlo !== z}
                onClick={() => ustaw({ zrodlo: z })}
                className={
                  zrodlo === z
                    ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white'
                    : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }
              >
                {OPROGRAMOWANIE_ZRODLO_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        {zrodlo === 'PLIK' && (
          <div>
            <label className="label">
              Plik instalacyjny {!edytowany && <span className="text-red-500">*</span>}
            </label>
            <input
              ref={plikRef}
              type="file"
              accept={INSTALATOR_ROZSZERZENIA.join(',')}
              className="input"
              onChange={(e) => wybierzPlik(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {edytowany?.plikNazwa && !plik
                ? `Obecny plik: ${edytowany.plikNazwa} — wybierz nowy tylko, jeśli chcesz go podmienić.`
                : `${INSTALATOR_ROZSZERZENIA.join(', ')} · do 1 GB`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Nazwa, np. ESET Endpoint Security" value={formularz.nazwa} onChange={(e) => ustaw({ nazwa: e.target.value })} />
          {zrodlo === 'WINGET' ? (
            <input
              className="input font-mono"
              placeholder="ID winget, np. Google.Chrome"
              value={formularz.wingetId}
              onChange={(e) => ustaw({ wingetId: e.target.value })}
            />
          ) : (
            <input
              className="input font-mono"
              placeholder="Parametry cichej instalacji"
              value={formularz.argumenty}
              onChange={(e) => ustaw({ argumenty: e.target.value })}
            />
          )}
        </div>
        {zrodlo === 'PLIK' && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Parametry, z którymi skrypt uruchomi instalator. Dla MSI zwykle <code>/qn /norestart</code>, dla EXE — zgodnie z
            dokumentacją producenta. Bez nich instalator pokaże okna i będzie czekał na kliknięcia.
          </p>
        )}
        <input className="input" placeholder="Opis (opcjonalnie)" value={formularz.opis} onChange={(e) => ustaw({ opis: e.target.value })} />

        {zapiszInstalator.postep !== null && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.round(zapiszInstalator.postep * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {zapiszInstalator.postep < 1
                ? `Wysyłanie pliku: ${Math.round(zapiszInstalator.postep * 100)}%`
                : 'Zapisywanie i liczenie sumy kontrolnej…'}
            </p>
          </div>
        )}
        {blad && <p className="field-error">{blad}</p>}

        <div className="flex justify-end gap-2">
          {edytowany && (
            <button type="button" className="btn-secondary" onClick={anuluj} disabled={zapisywanie}>
              Anuluj
            </button>
          )}
          <button type="button" className="btn-primary" disabled={zapisywanie} onClick={zapisz}>
            {zapisywanie ? 'Zapisywanie…' : edytowany ? 'Zapisz zmiany' : '+ Dodaj do katalogu'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={doUsuniecia !== null}
        title={`Usunąć „${doUsuniecia?.nazwa ?? ''}” z katalogu?`}
        description={
          doUsuniecia?.maPlik
            ? 'Plik instalacyjny zostanie usunięty z serwera, a program zniknie z profili. Wygenerowane skrypty z tym programem przestaną go instalować.'
            : 'Program zniknie też z profili. Wygenerowane już skrypty się nie zmienią.'
        }
        confirmLabel="Usuń"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() => doUsuniecia && deleteMutation.mutate(doUsuniecia.id, { onSuccess: () => setDoUsuniecia(null) })}
        onCancel={() => setDoUsuniecia(null)}
      />
    </div>
  );
}

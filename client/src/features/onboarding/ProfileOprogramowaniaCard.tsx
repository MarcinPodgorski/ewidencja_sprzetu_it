import { useState } from 'react';
import { profilOprogramowaniaCreateSchema } from 'shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ApiError } from '../../lib/api';
import type { ProfilOprogramowania } from '../../types/entities';
import { departmentsApi, oprogramowanieApi, profileOprogramowaniaApi } from '../entities';

interface Formularz {
  nazwa: string;
  opis: string;
  dzialId: string;
  oprogramowanieIds: Set<number>;
}

const pustyFormularz = (): Formularz => ({ nazwa: '', opis: '', dzialId: '', oprogramowanieIds: new Set() });

/** Profile = gotowe zestawy programów; profil przypisany do działu podpowiada się
 *  automatycznie przy onboardingu pracownika z tego działu. */
export function ProfileOprogramowaniaCard() {
  const { data: profile, isLoading } = profileOprogramowaniaApi.useList();
  const { data: katalog } = oprogramowanieApi.useList();
  const { data: dzialy } = departmentsApi.useList();
  const createMutation = profileOprogramowaniaApi.useCreate();
  const updateMutation = profileOprogramowaniaApi.useUpdate();
  const deleteMutation = profileOprogramowaniaApi.useArchive();

  const [edytowanyId, setEdytowanyId] = useState<number | null>(null);
  const [formularzOtwarty, setFormularzOtwarty] = useState(false);
  const [formularz, setFormularz] = useState<Formularz>(pustyFormularz);
  const [blad, setBlad] = useState<string | null>(null);
  const [doUsuniecia, setDoUsuniecia] = useState<ProfilOprogramowania | null>(null);

  function otworz(profil?: ProfilOprogramowania) {
    setEdytowanyId(profil?.id ?? null);
    setFormularz(
      profil
        ? {
            nazwa: profil.nazwa,
            opis: profil.opis ?? '',
            dzialId: profil.dzialId ? String(profil.dzialId) : '',
            oprogramowanieIds: new Set(profil.oprogramowanie.map((o) => o.id)),
          }
        : pustyFormularz(),
    );
    setBlad(null);
    setFormularzOtwarty(true);
  }

  function zamknij() {
    setFormularzOtwarty(false);
    setEdytowanyId(null);
    setBlad(null);
  }

  function przelacz(id: number) {
    setFormularz((prev) => {
      const nastepne = new Set(prev.oprogramowanieIds);
      if (nastepne.has(id)) nastepne.delete(id);
      else nastepne.add(id);
      return { ...prev, oprogramowanieIds: nastepne };
    });
  }

  function zapisz() {
    const wynik = profilOprogramowaniaCreateSchema.safeParse({
      nazwa: formularz.nazwa,
      opis: formularz.opis || undefined,
      dzialId: formularz.dzialId || undefined,
      oprogramowanieIds: [...formularz.oprogramowanieIds],
    });
    if (!wynik.success) {
      setBlad(wynik.error.issues[0]?.message ?? 'Nieprawidłowe dane');
      return;
    }
    // null zamiast undefined — przy edycji trzeba umieć odpiąć profil od działu.
    const dane = { ...wynik.data, dzialId: wynik.data.dzialId ?? null };
    const opcje = {
      onSuccess: zamknij,
      onError: (err: Error) => setBlad(err instanceof ApiError && err.status === 409 ? 'Profil o tej nazwie już istnieje' : err.message),
    };
    if (edytowanyId) updateMutation.mutate({ id: edytowanyId, data: dane }, opcje);
    else createMutation.mutate(dane, opcje);
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile oprogramowania</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Zestaw przypisany do działu podpowiada się automatycznie przy onboardingu pracownika z tego działu.
          </p>
        </div>
        {!formularzOtwarty && (
          <button type="button" className="btn-secondary shrink-0" onClick={() => otworz()}>
            + Nowy profil
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie…</p>
      ) : profile && profile.length > 0 ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {profile.map((profil) => (
            <li key={profil.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {profil.nazwa}
                  {profil.dzial && (
                    <span className="badge ml-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      dział: {profil.dzial.nazwa}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {profil.oprogramowanie.length > 0 ? profil.oprogramowanie.map((o) => o.nazwa).join(', ') : 'brak programów'}
                </p>
              </div>
              <div className="shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  className="mr-3 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  onClick={() => otworz(profil)}
                >
                  edytuj
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                  onClick={() => setDoUsuniecia(profil)}
                >
                  usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Brak profili.</p>
      )}

      {formularzOtwarty && (
        <div className="mt-4 space-y-3 rounded-md border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nazwa profilu</label>
              <input
                className="input"
                value={formularz.nazwa}
                onChange={(e) => setFormularz({ ...formularz, nazwa: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Domyślny dla działu</label>
              <select
                className="input"
                value={formularz.dzialId}
                onChange={(e) => setFormularz({ ...formularz, dzialId: e.target.value })}
              >
                <option value="">— żaden —</option>
                {dzialy?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nazwa}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Opis</label>
            <input
              className="input"
              value={formularz.opis}
              onChange={(e) => setFormularz({ ...formularz, opis: e.target.value })}
              placeholder="opcjonalnie"
            />
          </div>
          <div>
            <label className="label">Programy</label>
            {katalog && katalog.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {katalog.map((program) => (
                  <label key={program.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 dark:border-gray-600 dark:bg-gray-800"
                      checked={formularz.oprogramowanieIds.has(program.id)}
                      onChange={() => przelacz(program.id)}
                    />
                    {program.nazwa}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Najpierw dodaj programy do katalogu.</p>
            )}
          </div>
          {blad && <p className="field-error">{blad}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={zamknij}>
              Anuluj
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={zapisz}
            >
              {edytowanyId ? 'Zapisz profil' : 'Utwórz profil'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={doUsuniecia !== null}
        title={`Usunąć profil „${doUsuniecia?.nazwa ?? ''}”?`}
        description="Programy zostaną w katalogu. Wygenerowane już skrypty się nie zmienią."
        confirmLabel="Usuń"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() => doUsuniecia && deleteMutation.mutate(doUsuniecia.id, { onSuccess: () => setDoUsuniecia(null) })}
        onCancel={() => setDoUsuniecia(null)}
      />
    </div>
  );
}

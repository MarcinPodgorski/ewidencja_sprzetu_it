import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api';
import { useUstawieniaOnboardingu, useZapiszUstawieniaOnboardingu } from './onboarding.hooks';

/** Domyślny komunikat przy logowaniu — podpowiadany w formularzu skryptu (da się go tam zmienić). */
export function UstawieniaKomunikatuCard() {
  const { data } = useUstawieniaOnboardingu();
  const zapisz = useZapiszUstawieniaOnboardingu();
  const [tytul, setTytul] = useState('');
  const [tresc, setTresc] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setTytul(data.komunikatTytul);
      setTresc(data.komunikatTresc);
    }
  }, [data]);

  function handleZapisz() {
    setStatus(null);
    zapisz.mutate(
      { komunikatTytul: tytul, komunikatTresc: tresc },
      {
        onSuccess: () => setStatus('Zapisano.'),
        onError: (err) => setStatus(err instanceof ApiError ? err.message : 'Nie udało się zapisać'),
      },
    );
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Domyślny komunikat przy logowaniu</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Okno z tym tekstem pokazuje się przed zalogowaniem do Windowsa (trzeba kliknąć OK). Możesz użyć pól{' '}
        <code>{'{komputer}'}</code>, <code>{'{pracownik}'}</code> i <code>{'{dzial}'}</code>.
      </p>
      <div className="space-y-3">
        <div>
          <label className="label">Tytuł</label>
          <input className="input" value={tytul} onChange={(e) => setTytul(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className="label">Treść</label>
          <textarea className="input" rows={4} value={tresc} onChange={(e) => setTresc(e.target.value)} maxLength={2000} />
        </div>
        <div className="flex items-center justify-end gap-3">
          {status && <span className="text-xs text-gray-500 dark:text-gray-400">{status}</span>}
          <button type="button" className="btn-primary" disabled={zapisz.isPending} onClick={handleZapisz}>
            {zapisz.isPending ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

interface CandidateItem {
  id: number;
  numerEwidencyjny: string;
  markaModel: string;
}

interface PeripheralPairPanelProps {
  pairedWith: CandidateItem | null | undefined;
  candidates: CandidateItem[] | undefined;
  otherLabel: string;
  busy?: boolean;
  onPair: (otherId: number) => void;
  onUnpair: () => void;
}

/** Panel parowania mysz<->klawiatura, osadzany jako `detailExtra` na stronach szczegółów obu typów. */
export function PeripheralPairPanel({ pairedWith, candidates, otherLabel, busy, onPair, onUnpair }: PeripheralPairPanelProps) {
  const [selected, setSelected] = useState('');

  return (
    <div className="card mt-6 max-w-lg">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Zestaw</h2>
      {pairedWith ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Sparowano z: <span className="font-medium">{pairedWith.numerEwidencyjny}</span> ({pairedWith.markaModel})
          </p>
          <button type="button" className="btn-secondary" disabled={busy} onClick={onUnpair}>
            Rozłącz zestaw
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ten sprzęt nie jest częścią zestawu.</p>
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Wybierz {otherLabel}…</option>
            {candidates?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numerEwidencyjny} ({c.markaModel})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            disabled={!selected || busy}
            onClick={() => {
              onPair(Number(selected));
              setSelected('');
            }}
          >
            Połącz w zestaw
          </button>
        </div>
      )}
    </div>
  );
}

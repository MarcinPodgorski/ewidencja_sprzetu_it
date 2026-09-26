import { useState } from 'react';

interface MaskedFieldProps {
  value: string | null | undefined;
}

/** Pole z danymi wrażliwymi (PIN/PUK karty SIM, kod odblokowania telefonu) —
 *  domyślnie ukryte, chroni przed przypadkowym podejrzeniem "przez ramię". */
export function MaskedField({ value }: MaskedFieldProps) {
  const [visible, setVisible] = useState(false);

  if (!value) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 font-mono">
      <span>{visible ? value : '•'.repeat(Math.min(value.length, 8))}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-xs font-sans font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {visible ? 'ukryj' : 'pokaż'}
      </button>
    </span>
  );
}

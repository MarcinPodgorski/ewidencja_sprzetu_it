import { useState } from 'react';
import { kopiujDoSchowka } from '../lib/schowek';

/** Ciemna ramka z poleceniem PowerShella do wklejenia na komputerze + przycisk „Kopiuj”. */
export function KomendaDoSkopiowania({ komenda }: { komenda: string }) {
  const [skopiowano, setSkopiowano] = useState(false);

  async function kopiuj() {
    if (await kopiujDoSchowka(komenda)) {
      setSkopiowano(true);
      setTimeout(() => setSkopiowano(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-gray-900 px-4 py-3 dark:bg-black">
      <code className="flex-1 break-all font-mono text-base text-green-300">{komenda}</code>
      <button type="button" className="btn-secondary shrink-0" onClick={kopiuj}>
        {skopiowano ? 'Skopiowano' : 'Kopiuj'}
      </button>
    </div>
  );
}

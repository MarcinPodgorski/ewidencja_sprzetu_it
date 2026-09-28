import { COMPUTER_TYPE_LABELS, SYSTEM_OPERACYJNY_LABELS, type ComputerType, type PoleOdczytu, type SystemOperacyjny } from 'shared';
import { apiUrl } from '../../lib/api';
import type { OdczytSprzetu } from '../../types/entities';

/** Jednolinijkowiec do wklejenia w PowerShellu na komputerze (adres serwera z paska przeglądarki,
 *  tak jak przy onboardingu — komputer w tej samej sieci widzi aplikację pod tym samym adresem). */
export function komendaOdczytu(kod: string): string {
  return `irm ${window.location.origin}${apiUrl(`/odczyt/${kod}`)} | iex`;
}

export function StatusOdczytuBadge({ odczyt }: { odczyt: Pick<OdczytSprzetu, 'status' | 'zastapiony'> }) {
  if (odczyt.status === 'NOWY') {
    return (
      <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        do przejrzenia
      </span>
    );
  }
  if (odczyt.status === 'ZASTOSOWANY') {
    return <span className="badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">zastosowany</span>;
  }
  return (
    <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {odczyt.zastapiony ? 'zastąpiony nowszym' : 'odrzucony'}
    </span>
  );
}

/** Wartość pola komputera w czytelnej postaci (etykiety zamiast kodów enumów). */
export function opisWartosci(pole: PoleOdczytu, wartosc: unknown): string {
  if (wartosc === null || wartosc === undefined || wartosc === '') return '—';
  if (pole === 'typ') return COMPUTER_TYPE_LABELS[wartosc as ComputerType] ?? String(wartosc);
  if (pole === 'systemOperacyjny') return SYSTEM_OPERACYJNY_LABELS[wartosc as SystemOperacyjny] ?? String(wartosc);
  if (pole === 'ramRodzaj' && wartosc === 'INNY') return 'Inny';
  if (pole === 'ramIloscGb') return `${wartosc} GB`;
  return String(wartosc);
}

/** Porównanie „czy to zmiana” odporne na wielkość liter i spacje (np. MAC, numery seryjne). */
export function takieSame(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim().toUpperCase());
  return norm(a) === norm(b);
}

export const ENTRA_LABELS: Record<string, string> = {
  DOLACZONY: 'dołączony do Microsoft Entra ID',
  KONTO_SLUZBOWE: 'tylko konto służbowe (bez dołączenia)',
  BRAK: 'nie jest dołączony',
};

export const BITLOCKER_LABELS: Record<string, { tekst: string; klasa: string }> = {
  WLACZONY: { tekst: 'włączony', klasa: 'text-green-700 dark:text-green-400' },
  SZYFROWANIE: { tekst: 'trwa szyfrowanie', klasa: 'text-amber-700 dark:text-amber-400' },
  WSTRZYMANY: { tekst: 'wstrzymany (dysk zaszyfrowany, ochrona wyłączona)', klasa: 'text-amber-700 dark:text-amber-400' },
  WYLACZONY: { tekst: 'wyłączony — dysk nie jest szyfrowany', klasa: 'text-red-600 dark:text-red-400' },
};

/** MSFT_PhysicalDisk.BusType — tylko najczęstsze wartości. */
export const MAGISTRALE_DYSKOW: Record<number, string> = {
  1: 'SCSI',
  3: 'ATA',
  7: 'USB',
  8: 'RAID',
  10: 'SAS',
  11: 'SATA',
  12: 'karta SD',
  13: 'eMMC',
  14: 'wirtualny',
  15: 'wirtualny',
  17: 'NVMe',
};

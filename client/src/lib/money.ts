/**
 * Kwoty w bazie/API są zawsze w groszach (Int) — patrz uzasadnienie przy
 * `kosztBruttoGroszeSchema`/`kosztMiesiecznyGrosze` w shared/. Te dwie funkcje to
 * JEDYNE miejsce, gdzie dzieje się konwersja na/z "ludzkiej" kwoty w złotówkach —
 * używane wyłącznie na granicy formularza (wpisywanie/edycja), nigdy w API.
 */

/** Wartość z pola formularza (string z inputa, PLN) -> grosze do wysłania do API. */
export function plnToGrosze(raw: string): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}

/** Grosze z API -> PLN do wstawienia jako wartość edytowalnego pola formularza. */
export function groszeToPln(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  return value / 100;
}

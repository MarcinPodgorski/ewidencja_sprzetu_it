/** Polska odmiana rzeczownika po liczebniku: 1 odczyt, 2 odczyty, 5 odczytów, 22 odczyty, 12 odczytów. */
export function odmiana(n: number, [jeden, kilka, wiele]: [string, string, string]): string {
  if (n === 1) return jeden;
  const jednosci = n % 10;
  const setki = n % 100;
  return jednosci >= 2 && jednosci <= 4 && (setki < 12 || setki > 14) ? kilka : wiele;
}

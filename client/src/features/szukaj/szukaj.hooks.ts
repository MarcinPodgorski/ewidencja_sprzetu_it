import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { TypWynikuSzukania } from 'shared';
import { api } from '../../lib/api';

export interface WynikSzukania {
  typ: TypWynikuSzukania;
  id: number;
  tytul: string;
  podtytul: string | null;
  /** Wycofany sprzęt albo nieaktywny pracownik. */
  nieaktywny: boolean;
  /** Tylko „Różne”: karta pracownika, u którego jest pozycja. */
  pracownikId?: number;
  /** Pole, w którym znaleziono frazę, gdy nie widać go w tytule (np. „MAC (WiFi): …”). */
  dopasowanie: string | null;
}

export interface OdpowiedzSzukania {
  wyniki: WynikSzukania[];
  /** Liczba wszystkich trafień per typ — serwer zwraca tylko kilka najlepszych z każdego. */
  lacznie: Partial<Record<TypWynikuSzukania, number>>;
}

export const MIN_DLUGOSC_ZAPYTANIA = 2;

export function useSzukaj(q: string) {
  return useQuery({
    queryKey: ['szukaj', q],
    queryFn: () => api.get<OdpowiedzSzukania>('/szukaj', { q }),
    enabled: q.length >= MIN_DLUGOSC_ZAPYTANIA,
    // Poprzednie wyniki zostają na ekranie, dopóki nie przyjdą nowe — lista nie mruga przy pisaniu.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

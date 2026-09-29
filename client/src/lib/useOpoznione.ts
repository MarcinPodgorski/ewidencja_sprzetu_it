import { useEffect, useState } from 'react';

/** Wartość, która „dogania” zmiany po chwili bez nowych — np. zapytanie do API dopiero po przerwie w pisaniu. */
export function useOpoznione<T>(wartosc: T, ms: number): T {
  const [opoznione, setOpoznione] = useState(wartosc);
  useEffect(() => {
    const t = setTimeout(() => setOpoznione(wartosc), ms);
    return () => clearTimeout(t);
  }, [wartosc, ms]);
  return opoznione;
}

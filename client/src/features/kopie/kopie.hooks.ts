import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface KopiaZapasowa {
  nazwa: string;
  utworzono: string;
  rodzaj: 'AUTOMATYCZNA' | 'RECZNA' | 'PRZED_IMPORTEM';
  rozmiarBazy: number;
  liczbaPlikow: number;
  rozmiarPlikow: number;
}

export interface StanKopii {
  ostatnia: KopiaZapasowa | null;
  ostatniBlad: { kiedy: string; komunikat: string } | null;
  trwa: boolean;
  automatyczne: boolean;
  godzina: number;
  retencjaDni: number;
  nastepna: string | null;
  katalog: string;
  sciezkaBazy: string;
  katalogUploads: string;
  /** Aplikacja działa w kontenerze (docker-compose.yml) — inne polecenia przywracania. */
  docker: boolean;
}

export function useKopie() {
  return useQuery({
    queryKey: ['kopie'],
    queryFn: () => api.get<{ stan: StanKopii; items: KopiaZapasowa[] }>('/kopie'),
  });
}

export function useUtworzKopie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ item: KopiaZapasowa }>('/kopie').then((r) => r.item),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ['kopie'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]),
  });
}

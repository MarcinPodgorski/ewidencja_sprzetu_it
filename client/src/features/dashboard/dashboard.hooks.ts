import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface DashboardStats {
  counts: {
    computers: number;
    monitors: number;
    mice: number;
    keyboards: number;
    phones: number;
    simCards: number;
    printers: number;
    employees: number;
    appUsers: number;
    equipmentLists: number;
  };
  alerts: {
    lowToners: { id: number; oznaczenie: string; ilosc: number }[];
    expiringSimCards: { id: number; numerTelefonu: string; iccid: string; dataKoncaUmowy: string }[];
    /** Odczyty danych sprzętu (skrypt/onboarding/plik) czekające na przejrzenie. */
    odczytyDoPrzejrzenia: number;
    inwentaryzacjeWToku: { id: number; nazwa: string; liczbaPozycji: number; liczbaPotwierdzonych: number }[];
    /** Opis problemu z kopiami zapasowymi (brak świeżej kopii, nieudana próba) albo null. */
    problemKopii: string | null;
    /** Liczniki ze Stanu floty (bez „bez odczytu” — to informacja, nie problem). */
    stanFloty: { windows10: number; bitlocker: number; entraId: number; gwarancje: number; doWymiany: number };
  };
  kopie: { ostatnia: string | null; automatyczne: boolean };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });
}

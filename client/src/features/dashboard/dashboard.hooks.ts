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
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });
}

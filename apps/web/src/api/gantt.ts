import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface GanttProjectRow {
  id: string;
  name: string;
  code: string;
  status: string;
  customerId: string;
  customerName: string;
  startDate: string | null;
  endDate: string | null;
  hoursPaid: number;
  consumed: number;
  percentComplete: number;
  incomeAmount: number;
  currency: string;
}

export function useGanttProjects(customerId?: string) {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  const qs = params.toString();
  return useQuery({
    queryKey: ['gantt', 'projects', customerId],
    queryFn: () => api.get<{ rows: GanttProjectRow[] }>(`/gantt/projects${qs ? `?${qs}` : ''}`),
  });
}

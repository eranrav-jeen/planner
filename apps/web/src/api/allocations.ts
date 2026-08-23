import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface MonthlyAllocation {
  id: string;
  employeeId: string;
  projectId: string;
  month: string;
  plannedHours: number;
  actualHours: number | null;
  note?: string | null;
}

// Read-only: planned hours come from the milestone roll-up and actual hours
// from the attendance import. There is no client write path.
export function useAllocations(from: string, to: string, filters: { employeeId?: string; projectId?: string } = {}) {
  const params = new URLSearchParams({ from, to });
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.projectId) params.set('projectId', filters.projectId);

  return useQuery({
    queryKey: ['allocations', from, to, filters],
    queryFn: () => api.get<MonthlyAllocation[]>(`/allocations?${params.toString()}`),
  });
}

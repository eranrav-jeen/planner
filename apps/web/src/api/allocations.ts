import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export interface AllocationItemInput {
  employeeId: string;
  projectId: string;
  month: string;
  plannedHours: number;
  actualHours?: number | null;
}

export function useAllocations(from: string, to: string, filters: { employeeId?: string; projectId?: string } = {}) {
  const params = new URLSearchParams({ from, to });
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.projectId) params.set('projectId', filters.projectId);

  return useQuery({
    queryKey: ['allocations', from, to, filters],
    queryFn: () => api.get<MonthlyAllocation[]>(`/allocations?${params.toString()}`),
  });
}

export function useBulkUpsertAllocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: AllocationItemInput[]) => api.put<MonthlyAllocation[]>('/allocations', { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations'] }),
  });
}

export function useCopyForwardAllocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fromMonth: string; toMonths: string[]; employeeId?: string; projectId?: string }) =>
      api.post<MonthlyAllocation[]>('/allocations/copy', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations'] }),
  });
}

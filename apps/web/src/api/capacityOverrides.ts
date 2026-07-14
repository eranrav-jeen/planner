import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface CapacityOverride {
  id: string;
  employeeId: string;
  month: string;
  capacityHours: number;
  reason?: string | null;
}

export function useCapacityOverrides(from: string, to: string) {
  return useQuery({
    queryKey: ['capacity-overrides', from, to],
    queryFn: () => api.get<CapacityOverride[]>(`/capacity-overrides?from=${from}&to=${to}`),
  });
}

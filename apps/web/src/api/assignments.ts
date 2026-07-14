import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface AssignmentRow {
  id: string;
  employeeId: string;
  projectId: string;
  roleOnProject?: string | null;
  employee: { id: string; firstName: string; lastName: string; monthlyCapacityHours: number };
  project: { id: string; name: string; code: string; status: string };
}

export function useAssignments(filters: { employeeId?: string; projectId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  const qs = params.toString();

  return useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => api.get<AssignmentRow[]>(`/assignments${qs ? `?${qs}` : ''}`),
  });
}

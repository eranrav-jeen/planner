import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type WorkType =
  | 'specification'
  | 'design'
  | 'development'
  | 'testing'
  | 'research'
  | 'training_materials'
  | 'project_management';

export interface MilestoneLine {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string | null;
  workType: WorkType;
  effortPct: number;
  hours: number;
}

export interface Milestone {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  lines: MilestoneLine[];
}

export interface MilestonesView {
  milestones: Milestone[];
}

export interface MilestoneLineInput {
  employeeId: string;
  workType: WorkType;
  effortPct: number;
}

export interface MilestoneInput {
  name: string;
  startDate: string;
  endDate: string;
  lines: MilestoneLineInput[];
}

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => api.get<MilestonesView>(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });
}

// Milestone changes rewrite the project's planned allocations, so invalidate
// the planning/report/project caches alongside the milestone list.
function useMilestoneInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
    queryClient.invalidateQueries({ queryKey: ['allocations'] });
    queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };
}

export function useCreateMilestone(projectId: string) {
  const invalidate = useMilestoneInvalidation(projectId);
  return useMutation({
    mutationFn: (input: MilestoneInput) => api.post<MilestonesView>(`/projects/${projectId}/milestones`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateMilestone(projectId: string) {
  const invalidate = useMilestoneInvalidation(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MilestoneInput }) =>
      api.put<MilestonesView>(`/projects/${projectId}/milestones/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteMilestone(projectId: string) {
  const invalidate = useMilestoneInvalidation(projectId);
  return useMutation({
    mutationFn: (id: string) => api.delete<MilestonesView>(`/projects/${projectId}/milestones/${id}`),
    onSuccess: invalidate,
  });
}

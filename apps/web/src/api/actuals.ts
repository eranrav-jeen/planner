import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiUpload } from './client';

export type ImportStatus = 'pending_review' | 'committed' | 'superseded';

export interface ImportBatch {
  id: string;
  originalFileName: string;
  sourceCustomerName: string | null;
  customerId: string | null;
  customer?: { name: string } | null;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  entryCount: number;
  status: ImportStatus;
  createdAt: string;
  committedAt: string | null;
}

export interface PreviewLine {
  project: string;
  employee: string;
  subProject: string | null;
  month: string;
  hours: number;
}

export interface MatchEntry {
  source: string;
  matchedId: string | null;
}

export interface ImportPreview {
  employees: MatchEntry[];
  projects: MatchEntry[];
  customer: MatchEntry | null;
  lines: PreviewLine[];
}

export interface ImportDetail {
  batch: ImportBatch;
  preview: ImportPreview;
}

export interface CommitPayload {
  customerId?: string | null;
  employeeMappings: Record<string, string>;
  projectMappings: Record<string, string>;
  saveAliases: boolean;
}

export function useImportBatches() {
  return useQuery({
    queryKey: ['actuals', 'imports'],
    queryFn: () => api.get<ImportBatch[]>('/actuals/imports'),
  });
}

export function useImportBatch(id: string | undefined) {
  return useQuery({
    queryKey: ['actuals', 'imports', id],
    queryFn: () => api.get<ImportDetail>(`/actuals/imports/${id}`),
    enabled: !!id,
  });
}

export function useUploadActuals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => apiUpload<ImportDetail>('/actuals/imports', file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actuals', 'imports'] }),
  });
}

export function useCommitImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitPayload) => api.post<ImportBatch>(`/actuals/imports/${id}/commit`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actuals'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/actuals/imports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actuals'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

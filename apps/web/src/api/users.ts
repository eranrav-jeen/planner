import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Role } from '../lib/auth';

export interface User {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
  isActive: boolean;
  isRestricted: boolean;
  projectAccessIds: string[];
  createdAt: string;
}

export interface UserInput {
  email: string;
  password?: string;
  role: Role;
  employeeId?: string | null;
  isActive?: boolean;
  isRestricted?: boolean;
  projectAccessIds?: string[];
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    // `invited` is true when the backend emailed a set-password invite (password left blank).
    mutationFn: (input: UserInput) => api.post<User & { invited?: boolean }>('/users', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UserInput>) => api.put<User>(`/users/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useSendInvite() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/users/${id}/invite`),
  });
}

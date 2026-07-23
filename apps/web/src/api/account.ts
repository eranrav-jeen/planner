import { api } from './client';

// Public (unauthenticated) account-setup endpoints.

export function requestPasswordReset(email: string) {
  return api.post<{ ok: true }>('/auth/forgot-password', { email });
}

export function getSetPasswordInfo(token: string) {
  return api.get<{ email: string; purpose: 'invite' | 'reset' }>(`/auth/set-password/${encodeURIComponent(token)}`);
}

export function setPassword(token: string, password: string) {
  return api.post<{ ok: true }>('/auth/set-password', { token, password });
}

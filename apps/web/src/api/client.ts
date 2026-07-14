export interface ApiEnvelope<T> {
  data?: T;
  error?: { message: string; fields?: Record<string, string> };
}

export class ApiRequestError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok) {
    throw new ApiRequestError(res.status, body.error?.message ?? 'Request failed', body.error?.fields);
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, payload?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined }),
  put: <T>(path: string, payload?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: payload ? JSON.stringify(payload) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiRequestError } from '../api/client';

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  employeeId?: string | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<CurrentUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    await api.post('/auth/login', { email, password });
    const me = await api.get<CurrentUser>('/auth/me');
    setUser(me);
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiRequestError };

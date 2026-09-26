import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppUserRole } from 'shared';
import { api } from '../lib/api';

export interface CurrentUser {
  id: number;
  imie: string;
  nazwisko: string;
  login: string;
  rola: AppUserRole;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (login: string, haslo: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: CurrentUser }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(loginValue: string, haslo: string) {
    const res = await api.post<{ user: CurrentUser }>('/auth/login', { login: loginValue, haslo });
    setUser(res.user);
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth musi być używane wewnątrz <AuthProvider>');
  }
  return ctx;
}

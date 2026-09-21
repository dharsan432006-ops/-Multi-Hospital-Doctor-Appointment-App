import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, setAccessToken } from '../api/client.js';
import type { AuthUser } from '../api/types.js';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (v: { name: string; email: string; password: string; phone: string; consents: string[] }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<{ user: AuthUser }>('/auth/me');
      setUser(me.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    // Try silent refresh on boot (refresh cookie is httpOnly).
    (async () => {
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL as string | undefined) ?? '/api'}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const json = (await res.json()) as { data: { accessToken: string; user: AuthUser } };
          setAccessToken(json.data.accessToken);
          setUser(json.data.user);
        }
      } catch {
        // anonymous
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (v: { name: string; email: string; password: string; phone: string; consents: string[] }) => {
    await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(v) });
    await login(v.email, v.password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}

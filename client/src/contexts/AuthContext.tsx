import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, AppRole } from '../api/api';
import { apiLogin, apiMe, apiRegister, setUnauthorizedCallback } from '../api/api';
import { queryClient } from '../queryClient';

interface AuthCtx {
  user: User | null;
  role: AppRole | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: { displayName: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => void;
  init: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    if (t.split('.').length < 3) {
      localStorage.removeItem('token');
      return null;
    }
    return t;
  });
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  const init = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) {
      setToken(null);
      setUser(null);
      return;
    }
    setToken(t);
    try {
      setUser(await apiMe());
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(() => logout());
    return () => setUnauthorizedCallback(null);
  }, [logout]);

  useEffect(() => {
    void init();
  }, [init]);

  const login = useCallback(async (email: string, password: string) => {
    const t = await apiLogin(email, password);
    localStorage.setItem('token', t);
    setToken(t);
    const me = await apiMe();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (body: { displayName: string; email: string; password: string; phone?: string }) => {
      const t = await apiRegister(body);
      localStorage.setItem('token', t);
      setToken(t);
      const me = await apiMe();
      setUser(me);
      return me;
    },
    []
  );

  const role = user?.role ?? null;

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        init,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

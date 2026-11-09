import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { API_URL } from '@/constants/api';
import { clearTokens, loadTokens, saveTokens, type Tokens } from '@/lib/tokenStorage';

type Status = 'loading' | 'signedOut' | 'signedIn';

export class LoginError extends Error {
  constructor(public kind: 'credentials' | 'network' | 'server') {
    super(kind);
  }
}

type AuthContextValue = {
  status: Status;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** fetch() with the Bearer token; refreshes it once on 401 and signs out if that fails. */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const tokens = useRef<Tokens | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    loadTokens().then((stored) => {
      tokens.current = stored;
      setStatus(stored ? 'signedIn' : 'signedOut');
    });
  }, []);

  const signOut = useCallback(async () => {
    tokens.current = null;
    await clearTokens();
    setStatus('signedOut');
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw new LoginError('network');
    }
    if (res.status === 401 || res.status === 400) throw new LoginError('credentials');
    if (!res.ok) throw new LoginError('server');

    const json = (await res.json()) as Tokens;
    tokens.current = { access: json.access, refresh: json.refresh };
    await saveTokens(tokens.current);
    setStatus('signedIn');
  }, []);

  // One refresh at a time, even if several requests get a 401 together.
  const refreshAccess = useCallback((): Promise<boolean> => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = (async () => {
      const current = tokens.current;
      if (!current) return false;
      try {
        const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: current.refresh }),
        });
        if (!res.ok) return false;
        const json = (await res.json()) as { access: string; refresh?: string };
        tokens.current = { access: json.access, refresh: json.refresh ?? current.refresh };
        await saveTokens(tokens.current);
        return true;
      } catch {
        return false;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, []);

  const authFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const send = () =>
        fetch(`${API_URL}${path}`, {
          ...init,
          headers: {
            ...(init.headers as Record<string, string> | undefined),
            Authorization: `Bearer ${tokens.current?.access ?? ''}`,
          },
        });

      let res = await send();
      if (res.status === 401) {
        if (await refreshAccess()) {
          res = await send();
        }
        if (res.status === 401) await signOut();
      }
      return res;
    },
    [refreshAccess, signOut]
  );

  const value = useMemo(() => ({ status, signIn, signOut, authFetch }), [status, signIn, signOut, authFetch]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

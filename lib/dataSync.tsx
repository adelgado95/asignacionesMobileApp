import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';

const POLL_MS = 60_000;

type Ctx = { version: number; syncing: boolean; resync: () => void };
const DataSyncContext = createContext<Ctx>({ version: 0, syncing: false, resync: () => {} });

// Asks the backend once a minute when the data last changed (`GET /api/ultimo-cambio/`, a timestamp kept in a
// text file). Only when it differs from the last one seen does `version` go up, and every screen reloads its data
// (silently). Nothing else is fetched while nothing changed. `resync()` forces the same reload on demand.
export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const { authFetch } = useAuth();
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const lastSeen = useRef<string | null>(null);
  const checking = useRef(false);

  const fetchStamp = useCallback(async (): Promise<string | null> => {
    try {
      const res = await authFetch('/api/ultimo-cambio/?format=json');
      if (!res.ok) return null;
      const json = await res.json();
      return typeof json?.timestamp === 'string' && json.timestamp ? json.timestamp : null;
    } catch {
      return null; // offline or server down: try again next minute
    }
  }, [authFetch]);

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const stamp = await fetchStamp();
      if (!stamp) return;
      if (lastSeen.current === null) lastSeen.current = stamp; // first answer = reference point
      else if (stamp !== lastSeen.current) {
        lastSeen.current = stamp;
        setVersion((v) => v + 1);
      }
    } finally {
      checking.current = false;
    }
  }, [fetchStamp]);

  useEffect(() => {
    check();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') check();
    }, POLL_MS);
    // Back from the background (or the tab becomes visible again): check right away instead of waiting a minute.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [check]);

  const resync = useCallback(async () => {
    setSyncing(true);
    const stamp = await fetchStamp();
    if (stamp) lastSeen.current = stamp; // so the next poll doesn't reload a second time
    setVersion((v) => v + 1);
    setTimeout(() => setSyncing(false), 1000);
  }, [fetchStamp]);

  const value = useMemo(() => ({ version, syncing, resync }), [version, syncing, resync]);
  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export const useDataSync = () => useContext(DataSyncContext);

// Runs `reload` whenever the data changed on the server (or the user pressed re-sync); not on first render.
export function useOnDataChange(reload: () => void) {
  const { version } = useDataSync();
  const seen = useRef(version);
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    if (version === seen.current) return;
    seen.current = version;
    latest.current();
  }, [version]);
}

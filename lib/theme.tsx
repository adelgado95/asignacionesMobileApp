import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { Colors, type Palette } from '@/constants/Colors';

export type Scheme = 'light' | 'dark';
export type { Palette };

const KEY = 'theme_scheme';

// Preference only (not a secret): localStorage on web, SecureStore on devices.
async function loadScheme(): Promise<Scheme | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  } catch {
    return null;
  }
}
async function saveScheme(s: Scheme) {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, s);
    else await SecureStore.setItemAsync(KEY, s);
  } catch {
    // The choice just won't survive a restart.
  }
}

type Ctx = { scheme: Scheme; isDark: boolean; palette: Palette; toggle: () => void };
const ThemeContext = createContext<Ctx>({ scheme: 'light', isDark: false, palette: Colors.light, toggle: () => {} });

// Light by default (the previous look); the user's choice is remembered.
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadScheme().then((s) => {
      if (s) setScheme(s);
      setReady(true);
    });
  }, []);

  const toggle = useCallback(
    () =>
      setScheme((prev) => {
        const next: Scheme = prev === 'dark' ? 'light' : 'dark';
        saveScheme(next);
        return next;
      }),
    [],
  );

  const value = useMemo(
    () => ({ scheme, isDark: scheme === 'dark', palette: Colors[scheme], toggle }),
    [scheme, toggle],
  );
  if (!ready) return null; // avoid a light flash when the saved choice is dark
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Styles built from the active palette, rebuilt only when the scheme changes.
export function useThemed<T>(makeStyles: (palette: Palette) => T) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return { palette, styles };
}

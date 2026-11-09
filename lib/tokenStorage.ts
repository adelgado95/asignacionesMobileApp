import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Tokens = { access: string; refresh: string };

const KEY = 'auth_tokens';

// Keychain/Keystore on devices; localStorage on web (SecureStore is not available there).
export async function loadTokens(): Promise<Tokens | null> {
  try {
    const raw =
      Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  const raw = JSON.stringify(tokens);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearTokens(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing stored: already signed out.
  }
}

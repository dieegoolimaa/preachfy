import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { onDevHost } from './host';

export const API_URL = onDevHost(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001');

const native = Platform.OS !== 'web';

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: 'include' },
  plugins: native ? [expoClient({ scheme: 'preachfy', storagePrefix: 'preachfy', storage: SecureStore })] : [],
});

/** Calls our API with the session: a cookie on web, the stored one on native. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const client = authClient as unknown as { getCookie?: () => Promise<string> | string };
  // The stored cookie is read asynchronously on native, so it must be awaited before it is sent.
  const cookie = native ? await client.getCookie?.() : undefined;
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: native ? 'omit' : 'include',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...init.headers },
  });
}

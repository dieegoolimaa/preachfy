import { Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Newsreader_400Regular, useFonts } from '@expo-google-fonts/newsreader';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { apiFetch, authClient } from '@/lib/auth';
import { deviceLocale } from '@/lib/i18n';
import { flushReader, loadReader, updateReader, useReader } from '@/lib/store';
import { syncAll } from '@/lib/sync';

function useSync(ready: boolean) {
  const { data: session } = authClient.useSession();
  const { marks, studies, runs } = useReader();
  const userId = session?.user.id;

  useEffect(() => {
    if (!ready || !userId) return;
    // Pro is read each time, so a new subscription starts syncing without a restart.
    const run = () =>
      apiFetch('/me')
        .then(async (response) => {
          // Only a real answer changes the plan, so the Pulpit keeps working offline.
          if (response.status === 401) updateReader({ pro: false, proUntil: null });
          if (!response.ok) return;
          const me = (await response.json()) as { pro: boolean; expiresAt: number | null };
          updateReader({ pro: me.pro, proUntil: me.expiresAt });
          if (me.pro) await syncAll(userId);
        })
        .catch(() => {});
    const soon = setTimeout(run, 1000);
    const timer = setInterval(run, 60_000);
    const state = AppState.addEventListener('change', (next) => next === 'active' && run());
    return () => {
      clearTimeout(soon);
      clearInterval(timer);
      state.remove();
    };
  }, [ready, userId, marks, studies, runs]);
}

export default function RootLayout() {
  const [loaded] = useFonts({ Figtree_400Regular, Figtree_600SemiBold, Figtree_700Bold, Newsreader_400Regular });
  const { ready } = useReader();
  useEffect(() => {
    loadReader(deviceLocale());
    const state = AppState.addEventListener('change', (next) => next !== 'active' && flushReader());
    if (Platform.OS === 'web') window.addEventListener('pagehide', flushReader);
    return () => {
      state.remove();
      if (Platform.OS === 'web') window.removeEventListener('pagehide', flushReader);
    };
  }, []);
  useSync(ready);
  if (!loaded || !ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

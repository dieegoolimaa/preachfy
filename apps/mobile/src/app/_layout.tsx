import { Newsreader_400Regular, Newsreader_600SemiBold, useFonts } from '@expo-google-fonts/newsreader';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { apiFetch, authClient } from '@/lib/auth';
import { deviceLocale } from '@/lib/i18n';
import { loadReader, useReader } from '@/lib/store';
import { syncMarks } from '@/lib/sync';

function useSync(ready: boolean) {
  const { data: session } = authClient.useSession();
  const { marks } = useReader();
  const userId = session?.user.id;

  useEffect(() => {
    if (!ready || !userId) return;
    // Pro is read each time, so a new subscription starts syncing without a restart.
    const run = () =>
      apiFetch('/me')
        .then((response) => (response.ok ? response.json() : null))
        .then((me) => me?.pro && syncMarks(userId))
        .catch(() => {});
    const soon = setTimeout(run, 1000);
    const timer = setInterval(run, 60_000);
    const state = AppState.addEventListener('change', (next) => next === 'active' && run());
    return () => {
      clearTimeout(soon);
      clearInterval(timer);
      state.remove();
    };
  }, [ready, userId, marks]);
}

export default function RootLayout() {
  const [loaded] = useFonts({ Newsreader_400Regular, Newsreader_600SemiBold });
  const { ready } = useReader();
  useEffect(() => {
    loadReader(deviceLocale());
  }, []);
  useSync(ready);
  if (!loaded || !ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

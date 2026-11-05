import { Newsreader_400Regular, Newsreader_600SemiBold, useFonts } from '@expo-google-fonts/newsreader';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { loadReader, useReader } from '@/lib/store';

export default function RootLayout() {
  const [loaded] = useFonts({ Newsreader_400Regular, Newsreader_600SemiBold });
  const { ready } = useReader();
  useEffect(() => {
    loadReader();
  }, []);
  if (!loaded || !ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

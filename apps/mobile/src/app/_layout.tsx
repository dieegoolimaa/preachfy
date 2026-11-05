import { Newsreader_400Regular, Newsreader_600SemiBold, useFonts } from '@expo-google-fonts/newsreader';
import { Stack } from 'expo-router';

export default function RootLayout() {
  const [loaded] = useFonts({ Newsreader_400Regular, Newsreader_600SemiBold });
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

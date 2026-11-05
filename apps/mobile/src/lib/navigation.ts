import { router } from 'expo-router';

/** A reloaded or deep-linked page has no history, so closing falls back to the reader. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

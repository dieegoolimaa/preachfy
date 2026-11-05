import { canUse, type Feature } from '@preachfy/core';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { authClient } from './auth';
import { getReader, isPro, useReader } from './store';

export function usePro() {
  return isPro(useReader());
}

/** The paywall appears only when someone reaches for a Pro feature. */
export function requirePro(feature: Feature) {
  if (canUse(feature, isPro(getReader()))) return true;
  router.push({ pathname: '/paywall', params: { feature } });
  return false;
}

/** For a screen that can also be opened by its address. */
export function useProScreen(feature: Feature) {
  const allowed = canUse(feature, usePro());
  const { pro } = useReader();
  const { data: session, isPending } = authClient.useSession();
  // With an account, the plan is unknown until the API answers. Without one, it is free.
  const known = !isPending && (!session || pro !== null);
  useEffect(() => {
    if (!allowed && known) router.replace({ pathname: '/paywall', params: { feature } });
  }, [allowed, known, feature]);
  return allowed;
}

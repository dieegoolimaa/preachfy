import { canUse, type Feature } from '@preachfy/core';
import { router } from 'expo-router';

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

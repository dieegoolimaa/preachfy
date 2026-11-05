import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { apiFetch } from './auth';

const storeKey = Platform.OS === 'web' ? process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
// A release build with a Test Store key crashes on purpose, so it stays out of production.
const apiKey = storeKey || (__DEV__ ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY : undefined);

/** Expo Go has no store. RevenueCat falls back to a web checkout that only exists in a browser. */
export const inExpoGo = Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let currentUser: string | undefined;

/** The account id is the customer id, so a purchase in one place unlocks all of them. */
async function connect(userId: string) {
  if (!apiKey) throw new Error('RevenueCat is not configured');
  if (!currentUser) Purchases.configure({ apiKey, appUserID: userId });
  else if (currentUser !== userId) await Purchases.logIn(userId);
  currentUser = userId;
}

export async function loadPackages(userId: string): Promise<PurchasesPackage[]> {
  await connect(userId);
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

const refresh = () => apiFetch('/me/refresh', { method: 'POST' });

export async function buy(userId: string, item: PurchasesPackage) {
  await connect(userId);
  await Purchases.purchasePackage(item);
  await refresh();
}

export async function restore(userId: string) {
  await connect(userId);
  if (Platform.OS !== 'web') await Purchases.restorePurchases();
  await refresh();
}

export const isCancelled = (error: unknown) => Boolean((error as { userCancelled?: boolean })?.userCancelled);

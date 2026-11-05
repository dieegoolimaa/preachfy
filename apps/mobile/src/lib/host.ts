import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** In development, a phone reaches the Mac by its network address, never by localhost. */
function devHost() {
  if (!__DEV__) return undefined;
  if (Platform.OS === 'web') return window.location.hostname;
  return Constants.expoConfig?.hostUri?.split(':')[0];
}

const host = devHost();

export const onDevHost = (url: string) => (host ? url.replace('localhost', host) : url);

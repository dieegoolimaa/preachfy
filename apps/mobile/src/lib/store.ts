import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale, Mark } from '@preachfy/core';
import { useSyncExternalStore } from 'react';

export type ReaderState = {
  ready: boolean;
  locale: Locale;
  translation: string;
  book: string;
  chapter: number;
  verse?: number;
  marks: Mark[];
};

const KEY = 'preachfy.reader.v1';

export const defaultTranslation: Record<Locale, string> = { pt: 'blivre', en: 'kjv', es: 'rv1909' };

let state: ReaderState = { ready: false, locale: 'pt', translation: 'blivre', book: 'PSA', chapter: 23, marks: [] };
const listeners = new Set<() => void>();

function publish(next: ReaderState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function updateReader(patch: Partial<ReaderState>) {
  publish({ ...state, ...patch });
  const { ready: _ready, verse: _verse, ...saved } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
}

/** First run follows the device language; after that the saved choice wins. */
export async function loadReader(device: Locale) {
  const first = { locale: device, translation: defaultTranslation[device] };
  try {
    const saved = await AsyncStorage.getItem(KEY);
    publish({ ...state, ...first, ...(saved ? JSON.parse(saved) : null), ready: true });
  } catch {
    publish({ ...state, ...first, ready: true });
  }
}

export function useReader() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

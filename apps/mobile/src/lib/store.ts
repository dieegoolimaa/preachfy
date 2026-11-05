import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mark } from '@preachfy/core';
import { useSyncExternalStore } from 'react';

export type ReaderState = {
  ready: boolean;
  translation: string;
  book: string;
  chapter: number;
  verse?: number;
  marks: Mark[];
};

const KEY = 'preachfy.reader.v1';

let state: ReaderState = { ready: false, translation: 'blivre', book: 'PSA', chapter: 23, marks: [] };
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

export async function loadReader() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    publish({ ...state, ...(saved ? JSON.parse(saved) : null), ready: true });
  } catch {
    publish({ ...state, ready: true });
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale, Mark, PulpitRun, PulpitSession, Study } from '@preachfy/core';
import { useSyncExternalStore } from 'react';

export type ReaderState = {
  ready: boolean;
  locale: Locale;
  translation: string;
  book: string;
  chapter: number;
  verse?: number;
  marks: Mark[];
  studies: Study[];
  runs: PulpitRun[];
  /** Sessions in progress, so a crash or a closed app can resume. */
  sessions: Record<string, PulpitSession>;
  /** The open live class of each study. */
  liveCodes: Record<string, string>;
  /** Last known plan. Lets the Pulpit open offline, until `proUntil`. */
  pro: boolean | null;
  proUntil: number | null;
  syncUser?: string;
  syncCursor: number;
  syncPushedAt: number;
};

const KEY = 'preachfy.reader.v1';

export const defaultTranslation: Record<Locale, string> = { pt: 'blivre', en: 'kjv', es: 'rv1909' };

let state: ReaderState = { ready: false, locale: 'pt', translation: 'blivre', book: 'PSA', chapter: 23, marks: [], studies: [], runs: [], sessions: {}, liveCodes: {}, pro: null, proUntil: null, syncCursor: 0, syncPushedAt: 0 };
const listeners = new Set<() => void>();
let saving: ReturnType<typeof setTimeout> | undefined;

function publish(next: ReaderState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function persist() {
  if (saving) clearTimeout(saving);
  saving = undefined;
  const { ready: _ready, verse: _verse, ...saved } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
}

export function updateReader(patch: Partial<ReaderState>) {
  publish({ ...state, ...patch });
  persist();
}

/** Saves what is still waiting. Called when the app goes to the background or the page closes. */
export const flushReader = () => {
  if (saving) persist();
};

export const isPro = ({ pro, proUntil }: Pick<ReaderState, 'pro' | 'proUntil'>, now = Date.now()) =>
  Boolean(pro && (proUntil === null || proUntil > now));

/** Saves one study, stamping the edit so it wins over older copies. */
export function saveStudy(study: Study) {
  const edited = { ...study, updatedAt: Date.now() };
  const others = state.studies.filter((s) => s.id !== study.id);
  publish({ ...state, studies: [edited, ...others] });
  // Saving the whole state on every key would slow down typing.
  if (saving) clearTimeout(saving);
  saving = setTimeout(persist, 250);
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

export const getReader = () => state;

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

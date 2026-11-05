import { toLiveSteps, type Locale, type Study } from '@preachfy/core';

import { API_URL, apiFetch } from './auth';
import { onDevHost } from './host';
import { getReader, updateReader } from './store';
import { renderStudy } from './studyText';

export const WEB_URL = onDevHost(process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081');
export const classLink = (code: string) => `${WEB_URL}/live/${code}`;
export const screenLink = (code: string) => `${WEB_URL}/screen/${code}`;

export type LiveView = {
  code: string; title: string; goal: string; context: { label: string; body: string } | null;
  steps: { id: string; title: string; label: string; body: string; question?: string }[];
  total: number; current: number; started: boolean; ended: boolean; highlight: string | null; closing: string; expiresAt: number;
};

export async function readLive(code: string): Promise<LiveView | null> {
  const response = await fetch(`${API_URL}/live/${encodeURIComponent(code)}`);
  return response.ok ? response.json() : null;
}

export async function openLive(study: Study, locale: Locale): Promise<string | null> {
  const rendered = await renderStudy(study, locale);
  const steps = toLiveSteps(study, (_, index) => rendered.steps[index] ?? null);
  const response = await apiFetch('/live', {
    method: 'POST',
    body: JSON.stringify({ title: study.title, goal: study.goal ?? '', context: rendered.context, steps }),
  });
  if (!response.ok) return null;
  const { code } = (await response.json()) as { code: string };
  updateReader({ liveCodes: { ...getReader().liveCodes, [study.id]: code } });
  return code;
}

/** The class follows the Pulpit when it can. A failure here never stops the speaker. */
export function pushStep(code: string, current: number) {
  apiFetch(`/live/${code}/state`, { method: 'POST', body: JSON.stringify({ current }) }).catch(() => {});
}

export async function endLive(studyId: string, code: string, closing: string) {
  await apiFetch(`/live/${code}/end`, { method: 'POST', body: JSON.stringify({ closing }) }).catch(() => {});
  const { [studyId]: _ended, ...rest } = getReader().liveCodes;
  updateReader({ liveCodes: rest });
}

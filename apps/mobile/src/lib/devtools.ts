import { buildStudy, passageText, type Study } from '@preachfy/core';

import { apiFetch, authClient } from './auth';
import { newId } from './ids';
import { seedExample } from './example';
import { getReader, saveStudy, updateReader } from './store';

const EMAIL = 'dev@preachfy.test';
const PASSWORD = 'dev-password-1';

/** Signs in a fixed test account and unlocks Pro. Only reachable in development. */
export async function devLogin(): Promise<boolean> {
  const signedIn = await authClient.signIn.email({ email: EMAIL, password: PASSWORD });
  if (signedIn.error) {
    const created = await authClient.signUp.email({ name: 'Dev', email: EMAIL, password: PASSWORD });
    if (created.error) return false;
  }
  const response = await apiFetch('/dev/pro', { method: 'POST' });
  if (!response.ok) return false;
  const me = (await response.json()) as { pro: boolean; expiresAt: number | null };
  updateReader({ pro: me.pro, proUntil: me.expiresAt });
  return true;
}

/** A class on Psalm 23 with base texts and a question, ready to open. */
export function seedStudy(locale: 'pt' | 'en' | 'es'): string {
  const existing = getReader().studies.find((x) => x.title === 'Salmo 23 (teste)' && !x.deletedAt && x.steps.every((step) => step.blocks));
  if (existing) return existing.id;
  // Older test studies, from before blocks, are retired instead of piling up.
  for (const old of getReader().studies.filter((x) => x.title === 'Salmo 23 (teste)' && !x.deletedAt)) saveStudy({ ...old, deletedAt: Date.now() });
  const passage = { book: 'PSA', chapter: 23, from: 1, to: 6, translationId: getReader().translation };
  const id = newId();
  const base = buildStudy({ id, kind: 'class', title: 'Salmo 23 (teste)', passage, marks: getReader().marks, locale, now: Date.now(), newId });
  const steps = base.steps.map((step, i) => ({
    ...step,
    baseText: step.baseText ?? passageText(passage, 1 + (i % 6), 1 + (i % 6)),
    blocks: (step.blocks ?? []).map((block) =>
      block.kind === 'activity' ? block : { ...block, text: block.text || `Texto de ${block.kind} do passo ${i + 1}.`, ...(block.kind === 'question' ? { expectedAnswer: 'Resposta esperada' } : {}) },
    ),
  }));
  const study: Study = { ...base, steps, goal: 'Entender o cuidado do Pastor' };
  saveStudy(study);
  return id;
}

/** Development: deletes every message and starts again from the sample one. */
export function resetStudies() {
  const at = Date.now();
  for (const study of getReader().studies.filter((x) => !x.deletedAt)) saveStudy({ ...study, deletedAt: at });
  updateReader({ runs: getReader().runs.map((run) => ({ ...run, deletedAt: run.deletedAt ?? at, updatedAt: at })), sessions: {}, liveCodes: {}, exampleSeeded: false });
  seedExample(true);
}

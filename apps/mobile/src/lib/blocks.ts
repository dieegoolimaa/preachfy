import type { BlockKind } from '@preachfy/core';

export type ShownKind = BlockKind | 'scripture';

/** A color per kind, so the sequence can be read at a glance. Ink would vanish on the dark stage. */
export const blockColor = (kind: ShownKind, dark = false) =>
  ({ scripture: '#F2C14E', idea: dark ? '#FFFFFF' : '#16181D', illustration: '#F0875F', question: '#6FB7E8', application: '#9ED077', prayer: '#A59CE8', cue: '#C4B5A5', activity: '#7CCFC0' })[kind];

export const blockKey = {
  scripture: 'blockScripture', idea: 'blockIdea', illustration: 'blockIllustration', question: 'blockQuestion',
  application: 'blockApplication', prayer: 'blockPrayer', cue: 'blockCue', activity: 'blockActivity',
} as const;

/** "Ponto 1", "Idea 2": names the app made up. They say nothing, so they are never shown. */
export const isGenericTitle = (title: string) => !title.trim() || /^(ponto|point|punto|ideia|idea)\s*\d+$/i.test(title.trim());

type Named = { title: string; blocks?: { text?: string }[]; notes?: string };

/** What to call a step: its own name, or else the first words of what is in it. */
export function stepName(step: Named, fallback = '') {
  if (!isGenericTitle(step.title)) return step.title.trim();
  if (fallback) return fallback;
  const text = (step.blocks?.find((b) => b.text?.trim())?.text ?? step.notes ?? '').trim().replace(/\s+/g, ' ');
  const words = text.split(' ').slice(0, 5).join(' ');
  return words ? `${words}${text.split(' ').length > 5 ? '…' : ''}` : '';
}

/** The number of a step among the author's own steps: the introduction and conclusion do not count. */
export const stepNumber = (steps: { role?: string }[], index: number) => steps.slice(0, index + 1).filter((step) => !step.role).length;

import type { BlockKind } from '@preachfy/core';

export type ShownKind = BlockKind | 'scripture';

/** A color per kind, so the sequence can be read at a glance. Ink would vanish on the dark stage. */
export const blockColor = (kind: ShownKind, dark = false) =>
  ({ scripture: '#F2C14E', idea: dark ? '#FFFFFF' : '#16181D', illustration: '#F0875F', question: '#6FB7E8', application: '#9ED077', prayer: '#A59CE8', cue: '#C4B5A5', activity: '#7CCFC0' })[kind];

export const blockKey = {
  scripture: 'blockScripture', idea: 'blockIdea', illustration: 'blockIllustration', question: 'blockQuestion',
  application: 'blockApplication', prayer: 'blockPrayer', cue: 'blockCue', activity: 'blockActivity',
} as const;

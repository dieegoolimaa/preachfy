import type { PulpitSection } from './pulpitSession.ts';

export type VerseRef = { book: string; chapter: number; verse: number };

/**
 * A selected piece of one verse; a selection across verses is several spans.
 * No offsets means the whole verse. Offsets are UTF-16 positions in
 * `translationId`; `quote` finds the span in another translation.
 */
export type VerseSpan = { ref: VerseRef; translationId: string; start?: number; end?: number; quote?: string };

export type TextRange = { start: number; end: number };
export type SpanResolution =
  | ({ kind: 'exact' | 'relocated' } & TextRange)
  /** The words were not found, so the app marks the verse instead of dropping the mark. */
  | { kind: 'wholeVerse' };

/** Folds case and accents, keeping each folded unit's position in the original text. */
function fold(text: string): { folded: string; positions: number[] } {
  let folded = '';
  const positions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const unit = text[i]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const char of unit) {
      folded += char;
      positions.push(i);
    }
  }
  return { folded, positions };
}

export function resolveSpan(span: VerseSpan, text: string, translationId: string): SpanResolution {
  const { start, end, quote } = span;
  if (start === undefined || end === undefined) return { kind: 'wholeVerse' };
  const inBounds = start >= 0 && start < end && end <= text.length;
  if (translationId === span.translationId && inBounds && (!quote || text.slice(start, end) === quote)) {
    return { kind: 'exact', start, end };
  }
  if (quote) {
    const haystack = fold(text);
    const needle = fold(quote).folded;
    const at = haystack.folded.indexOf(needle);
    if (at >= 0) {
      const last = haystack.positions[at + needle.length - 1]!;
      return { kind: 'relocated', start: haystack.positions[at]!, end: last + 1 };
    }
  }
  return { kind: 'wholeVerse' };
}

export type MarkScope = { kind: 'bible' } | { kind: 'study'; studyId: string };
export type Mark = { id: string; scope: MarkScope; spans: VerseSpan[]; categoryKey: string; note: string };
export type ReadingLayer = { kind: 'clean' } | { kind: 'personal' } | { kind: 'study'; studyId: string };

export function visibleMarks(layer: ReadingLayer, marks: Mark[]): Mark[] {
  if (layer.kind === 'clean') return [];
  if (layer.kind === 'personal') return marks.filter((m) => m.scope.kind === 'bible');
  return marks.filter((m) => m.scope.kind === 'study' && m.scope.studyId === layer.studyId);
}

export type Snapshot = { id: string; createdAt: number; marks: Mark[] };

/** Frozen copy of marks for one study. Later edits on either side stay separate. */
export function captureSnapshot(id: string, source: Mark[], createdAt: number, newId: () => string): Snapshot {
  const marks = source.map((m) => ({
    ...(JSON.parse(JSON.stringify(m)) as Mark),
    id: newId(),
    scope: { kind: 'study', studyId: id } as const,
  }));
  return { id, createdAt, marks };
}

export type StudyText = { kind: 'scripture'; spans: VerseSpan[] } | { kind: 'authored'; text: string };
export type Step = { id: string; title: string; baseText?: StudyText; notes: string; plannedMs: number };
export type Study = { id: string; title: string; context?: StudyText; snapshot?: Snapshot; steps: Step[] };

export function hasBaseText({ baseText }: Step): boolean {
  if (!baseText) return false;
  return baseText.kind === 'scripture' ? baseText.spans.length > 0 : baseText.text.trim().length > 0;
}

/** Drafts may have gaps; the Pulpit only opens with a base text on every step. */
export const stepsMissingBaseText = (study: Study) => study.steps.filter((s) => !hasBaseText(s));
export const isReadyForPulpit = (study: Study) => study.steps.length > 0 && stepsMissingBaseText(study).length === 0;
export const pulpitSections = (study: Study): PulpitSection[] =>
  study.steps.map(({ title, plannedMs }) => ({ title, plannedMs }));

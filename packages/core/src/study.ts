import type { PulpitSection } from './pulpitSession.ts';

export const foldText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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
export type Mark = {
  id: string;
  scope: MarkScope;
  spans: VerseSpan[];
  categoryKey: string;
  note: string;
  updatedAt?: number;
  /** Kept as a tombstone so a removal reaches the other devices. */
  deletedAt?: number;
};
export type ReadingLayer = { kind: 'clean' } | { kind: 'personal' } | { kind: 'study'; studyId: string };

export function visibleMarks(layer: ReadingLayer, marks: Mark[]): Mark[] {
  if (layer.kind === 'clean') return [];
  const live = marks.filter((m) => !m.deletedAt);
  if (layer.kind === 'personal') return live.filter((m) => m.scope.kind === 'bible');
  return live.filter((m) => m.scope.kind === 'study' && m.scope.studyId === layer.studyId);
}

type Synced = { id: string; updatedAt?: number };
const editedAt = (item: Synced) => item.updatedAt ?? 1;

/** Items changed since the last upload. Older saved items have no date and count as changed once. */
export const itemsToPush = <T extends Synced>(items: T[], pushedAt: number) => items.filter((i) => editedAt(i) > pushedAt);
export const marksToPush = (marks: Mark[], pushedAt: number) => itemsToPush(marks, pushedAt);

/** Applies items from the server; the most recent edit of each one wins. */
export function mergeItems<T extends Synced>(local: T[], incoming: T[]): T[] {
  const byId = new Map(local.map((item) => [item.id, item]));
  for (const item of incoming) {
    const current = byId.get(item.id);
    if (!current || editedAt(item) >= editedAt(current)) byId.set(item.id, item);
  }
  return [...byId.values()];
}
export const mergeMarks = (local: Mark[], incoming: Mark[]) => mergeItems(local, incoming);

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
export type Step = {
  id: string;
  title: string;
  baseText?: StudyText;
  /** The full manuscript. `outline` and `keywords` are shorter versions for the Pulpit. */
  notes: string;
  outline?: string;
  keywords?: string;
  plannedMs: number;
  /** Advice from the template, shown while writing. */
  guidance?: string;
  /** Categories of the author's marks suggested for this step. */
  feeds?: string[];
  /** Introduction opens the message and conclusion closes it; the steps between are the author's. */
  role?: 'intro' | 'conclusion';
  /** The blocks after the base text: what to say, in order. When absent, `notes` and `question` stand in. */
  blocks?: Block[];
  /** A sentence that leads into the next step. */
  bridge?: string;
  /** Sent to students in a live class. */
  question?: string;
  /** Private to the teacher. */
  expectedAnswer?: string;
};
export type BlockKind = 'idea' | 'illustration' | 'question' | 'application' | 'prayer' | 'cue' | 'activity';
export const BLOCK_KINDS: BlockKind[] = ['idea', 'illustration', 'question', 'application', 'prayer', 'cue', 'activity'];
export type Block = {
  id: string;
  kind: BlockKind;
  text: string;
  /** Shorter versions of an idea, for the Pulpit. */
  outline?: string;
  keywords?: string;
  /** Private to the teacher. */
  expectedAnswer?: string;
  /** For an activity with a timer. */
  minutes?: number;
};

export type StudyKind = 'outline' | 'study' | 'devotional' | 'class' | 'talk';
export type Passage = { book: string; chapter: number; from: number; to: number; translationId: string };
export type Study = {
  id: string;
  title: string;
  kind?: StudyKind;
  passage?: Passage;
  /** Central idea or class goal, depending on the template. */
  goal?: string;
  /** How long the whole message should last. */
  targetMinutes?: number;
  context?: StudyText;
  snapshot?: Snapshot;
  steps: Step[];
  scheduledFor?: number;
  createdAt?: number;
  updatedAt?: number;
  /** Kept as a tombstone so a removal reaches the other devices. */
  deletedAt?: number;
};

/** One time the content was delivered. The same study can be preached many times. */
export type PulpitRun = {
  id: string;
  studyId: string;
  title: string;
  startedAt: number;
  endedAt: number;
  plannedMs: number;
  spentMs: number[];
  place?: string;
  note?: string;
  audio?: RunAudio;
  updatedAt?: number;
  deletedAt?: number;
};

/** A chapter is added each time the speaker moves to a step. */
export type RecordingChapter = { atMs: number; stepIndex: number };
export type RunAudio = { file: string; durationMs: number; chapters: RecordingChapter[] };

export function addChapter(chapters: RecordingChapter[], atMs: number, stepIndex: number): RecordingChapter[] {
  const last = chapters[chapters.length - 1];
  if (last?.stepIndex === stepIndex) return chapters;
  // Passing through a step in under a second is a slip, not a chapter.
  if (last && atMs - last.atMs < 1000) return [...chapters.slice(0, -1), { atMs: last.atMs, stepIndex }];
  return [...chapters, { atMs, stepIndex }];
}

export const passageSpans = ({ book, chapter, from, to, translationId }: Passage, first = from, last = to): VerseSpan[] =>
  Array.from({ length: last - first + 1 }, (_, i) => ({ ref: { book, chapter, verse: first + i }, translationId }));

export const passageText = (passage: Passage, first = passage.from, last = passage.to): StudyText => ({
  kind: 'scripture',
  spans: passageSpans(passage, first, last),
});

/** The author's personal marks that touch the passage, which feed a new study. */
export function marksInPassage(marks: Mark[], { book, chapter, from, to }: Passage): Mark[] {
  return visibleMarks({ kind: 'personal' }, marks).filter((m) =>
    m.spans.some((s) => s.ref.book === book && s.ref.chapter === chapter && s.ref.verse >= from && s.ref.verse <= to),
  );
}

/** Snapshot marks whose category feeds this step. */
export const stepSuggestions = (study: Study, step: Step): Mark[] =>
  (study.snapshot?.marks ?? []).filter((m) => !m.deletedAt && step.feeds?.includes(m.categoryKey));

export type StepDetail = 'manuscript' | 'outline' | 'keywords';

/** The Pulpit falls back to the longer text when a shorter one was not written. */
export function stepBody(step: Step, detail: StepDetail): string {
  const outline = step.outline?.trim();
  const keywords = step.keywords?.trim();
  if (detail === 'keywords') return keywords || outline || step.notes;
  if (detail === 'outline') return outline || step.notes;
  return step.notes;
}

/** Steps saved before blocks existed keep working: their notes and question become blocks. */
export function stepBlocks(step: Step): Block[] {
  if (step.blocks) return step.blocks;
  const out: Block[] = [];
  if (step.notes.trim() || step.outline?.trim() || step.keywords?.trim()) {
    out.push({ id: `${step.id}-idea`, kind: 'idea', text: step.notes, ...(step.outline ? { outline: step.outline } : {}), ...(step.keywords ? { keywords: step.keywords } : {}) });
  }
  if (step.question?.trim()) {
    out.push({ id: `${step.id}-question`, kind: 'question', text: step.question, ...(step.expectedAnswer ? { expectedAnswer: step.expectedAnswer } : {}) });
  }
  return out;
}

/** The Pulpit skips blocks with nothing in them, except an activity, which has its own timer. */
export const visibleBlocks = (step: Step): Block[] => stepBlocks(step).filter((b) => b.kind === 'activity' || b.text.trim().length > 0);

/** An idea shows its shorter versions when the Pulpit asks for them. */
export function blockBody(block: Block, detail: StepDetail): string {
  if (block.kind !== 'idea') return block.text;
  const outline = block.outline?.trim();
  const keywords = block.keywords?.trim();
  if (detail === 'keywords') return keywords || outline || block.text;
  if (detail === 'outline') return outline || block.text;
  return block.text;
}

export const WORDS_PER_MINUTE = 130;
export const ACTIVITY_DEFAULT_MINUTES = 5;
const READING_MS = 30_000;

export const countWords = (text: string) => (text.match(/\S+/g) ?? []).length;

/** Speaking time of one block, from the words written. */
export function blockSpeechMs(block: Block): number {
  if (block.kind === 'activity') return (block.minutes ?? ACTIVITY_DEFAULT_MINUTES) * 60_000;
  return Math.round((countWords(block.text) / WORDS_PER_MINUTE) * 60_000);
}

/** How long a step takes to say, so the plan can be checked against what was written. */
export function estimateSpeechMs(step: Step): number {
  const read = hasBaseText(step) ? READING_MS : 0;
  return read + stepBlocks(step).reduce((sum, block) => sum + blockSpeechMs(block), 0);
}

export const plannedMinutes = (study: Study) => Math.round(study.steps.reduce((sum, step) => sum + step.plannedMs, 0) / 60_000);

export type LiveStep = { id: string; title: string; label: string; body: string; question?: string };

/** What leaves the teacher's device: never notes, outlines or expected answers. */
export function toLiveSteps(study: Study, render: (text: StudyText | undefined, index: number) => { label: string; body: string } | null): LiveStep[] {
  return study.steps.map((step, index) => {
    const text = render(step.baseText, index);
    const question = (stepBlocks(step).find((b) => b.kind === 'question' && b.text.trim())?.text ?? step.question ?? '').trim();
    return { id: step.id, title: step.title, label: text?.label ?? '', body: text?.body ?? '', ...(question ? { question } : {}) };
  });
}

/** Content with a date still ahead, soonest first. */
export function upcoming<T extends { deletedAt?: number; scheduledFor?: number }>(items: T[], now: number): T[] {
  return items
    .filter((item) => !item.deletedAt && item.scheduledFor !== undefined && item.scheduledFor >= now)
    .sort((a, b) => a.scheduledFor! - b.scheduledFor!);
}

export function hasBaseText({ baseText }: Step): boolean {
  if (!baseText) return false;
  return baseText.kind === 'scripture' ? baseText.spans.length > 0 : baseText.text.trim().length > 0;
}

/** Drafts may have gaps; the Pulpit only opens with a base text on every step. */
export const stepsMissingBaseText = (study: Study) => study.steps.filter((s) => s.role !== 'conclusion' && !hasBaseText(s));
export const isReadyForPulpit = (study: Study) => study.steps.length > 0 && stepsMissingBaseText(study).length === 0;
export const pulpitSections = (study: Study): PulpitSection[] =>
  study.steps.map(({ title, plannedMs }) => ({ title, plannedMs }));

/**
 * The content to show first: the soonest dated one that has not passed,
 * otherwise the one edited most recently.
 */
export function nextStudy<T extends { deletedAt?: number; scheduledFor?: number; updatedAt?: number }>(items: T[], now: number): T | undefined {
  const live = items.filter((item) => !item.deletedAt);
  const dated = live.filter((item) => item.scheduledFor !== undefined && item.scheduledFor >= now - 3_600_000);
  if (dated.length) return dated.sort((a, b) => a.scheduledFor! - b.scheduledFor!)[0];
  return live.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOOKS, bookName, parseReference, searchBook,
  canUse, captureSnapshot, elapsed, goTo, isReadyForPulpit, pace, pause, remaining, resolveSpan, resume,
  selectionSpans, spentInSection, startSession, stepsMissingBaseText, timerState, visibleMarks, wordsOf,
} from '../src/index.ts';
import type { Mark, Study, VerseSpan } from '../src/index.ts';

const sections = [
  { title: 'Introdução', plannedMs: 300_000 },
  { title: 'Ponto 1', plannedMs: 600_000 },
  { title: 'Conclusão', plannedMs: 300_000 },
];
const s0 = () => startSession(sections, 0);

test('timer moves from normal to warning to over', () => {
  assert.equal(timerState(s0(), 100_000), 'normal');
  assert.equal(timerState(s0(), 900_000), 'warning');
  assert.equal(timerState(s0(), 1_201_000), 'over');
  assert.equal(remaining(s0(), 1_210_000), -10_000);
});

test('pause stops the clock', () => {
  const paused = pause(s0(), 60_000);
  assert.equal(elapsed(paused, 500_000), 60_000);
  assert.equal(elapsed(resume(paused, 500_000), 510_000), 70_000);
});

test('pace compares actual and planned section start', () => {
  assert.deepEqual(pace(s0()), { kind: 'onPace' });
  assert.deepEqual(pace(goTo(s0(), 1, 420_000)), { kind: 'behind', ms: 120_000 });
  assert.deepEqual(pace(goTo(s0(), 1, 180_000)), { kind: 'ahead', ms: 120_000 });
});

test('revisited section keeps its time and first entry', () => {
  const s = goTo(goTo(goTo(s0(), 1, 300_000), 0, 400_000), 1, 450_000);
  assert.equal(spentInSection(s, 0, 450_000), 350_000);
  assert.equal(spentInSection(s, 1, 460_000), 110_000);
  assert.deepEqual(pace(s), { kind: 'onPace' });
});

test('invalid navigation is ignored', () => {
  assert.equal(goTo(s0(), 9, 10).currentIndex, 0);
});

test('clock survives relaunch through JSON', () => {
  const restored = JSON.parse(JSON.stringify(goTo(s0(), 1, 300_000)));
  assert.equal(elapsed(restored, 1_000_000), 1_000_000);
});

const verse = 'O Senhor é o meu pastor; nada me faltará.';
const span: VerseSpan = {
  ref: { book: 'sl', chapter: 23, verse: 1 }, translationId: 'a', start: 13, end: 23, quote: 'meu pastor',
};

test('word span resolves exactly', () => {
  assert.deepEqual(resolveSpan(span, verse, 'a'), { kind: 'exact', start: 13, end: 23 });
});

test('word span relocates ignoring case and accents, in original positions', () => {
  const text = 'Javé é o Meu Pastór, de nada terei falta.';
  const found = resolveSpan(span, text, 'b');
  assert.equal(found.kind, 'relocated');
  if (found.kind === 'relocated') assert.equal(text.slice(found.start, found.end), 'Meu Pastór');
});

test('relocation handles decomposed accents', () => {
  const text = 'Javé é o meu pastor.';
  const found = resolveSpan(span, text, 'b');
  assert.ok(found.kind === 'relocated');
  assert.equal(text.slice(found.start, found.end), 'meu pastor');
});

test('missing words fall back to the whole verse', () => {
  assert.deepEqual(resolveSpan(span, 'The LORD is my shepherd', 'kjv'), { kind: 'wholeVerse' });
});

const personal = (): Mark => ({ id: 'm1', scope: { kind: 'bible' }, spans: [span], categoryKey: 'promessa', note: 'original' });

test('layers separate marks', () => {
  const mark = personal();
  const snap = captureSnapshot('st1', [mark], 0, () => 'm2');
  const all = [mark, ...snap.marks];
  assert.deepEqual(visibleMarks({ kind: 'clean' }, all), []);
  assert.deepEqual(visibleMarks({ kind: 'personal' }, all), [mark]);
  assert.deepEqual(visibleMarks({ kind: 'study', studyId: 'st1' }, all), snap.marks);
});

test('snapshot stays frozen', () => {
  const mark = personal();
  const snap = captureSnapshot('st1', [mark], 0, () => 'm2');
  mark.note = 'editada';
  mark.spans[0]!.quote = 'outra';
  assert.equal(snap.marks[0]!.note, 'original');
  assert.equal(snap.marks[0]!.spans[0]!.quote, 'meu pastor');
  assert.notEqual(snap.marks[0]!.id, mark.id);
});

test('pulpit requires a base text on every step', () => {
  const study: Study = { id: 's', title: 'Salmo 23', steps: [
    { id: '1', title: 'Ponto 1', baseText: { kind: 'scripture', spans: [span] }, notes: '', plannedMs: 0 },
    { id: '2', title: 'Ponto 2', baseText: { kind: 'authored', text: '   ' }, notes: '', plannedMs: 0 },
  ] };
  assert.equal(isReadyForPulpit(study), false);
  assert.deepEqual(stepsMissingBaseText(study).map((s) => s.title), ['Ponto 2']);
  study.steps[1]!.baseText = { kind: 'authored', text: 'Ele está comigo' };
  assert.equal(isReadyForPulpit(study), true);
  assert.equal(isReadyForPulpit({ id: 'e', title: 'Vazio', steps: [] }), false);
});

test('reading, simple marking, copying and sharing are free', () => {
  for (const f of ['read', 'search', 'cleanMode', 'simpleMark', 'copyVerse', 'shareVerse'] as const) assert.equal(canUse(f, false), true);
  for (const f of ['notes', 'pulpit', 'snapshot', 'create', 'sync', 'liveClass'] as const) assert.equal(canUse(f, false), false);
  assert.equal(canUse('pulpit', true), true);
  assert.equal(canUse('exportOwnContent', false), true);
});

const psalm = [
  { ref: { book: 'sl', chapter: 23, verse: 1 }, text: 'The LORD is my shepherd; I shall not want.' },
  { ref: { book: 'sl', chapter: 23, verse: 2 }, text: 'He maketh me to lie down in green pastures.' },
];

test('words ignore punctuation and keep positions', () => {
  const words = wordsOf(psalm[0]!.text);
  assert.equal(words[4]!.text, 'shepherd');
  assert.equal(psalm[0]!.text.slice(words[4]!.start, words[4]!.end), 'shepherd');
});

test('selecting inside a verse gives one exact span, in either tap order', () => {
  const forward = selectionSpans(psalm, 'kjv', { verseIndex: 0, wordIndex: 3 }, { verseIndex: 0, wordIndex: 4 });
  const backward = selectionSpans(psalm, 'kjv', { verseIndex: 0, wordIndex: 4 }, { verseIndex: 0, wordIndex: 3 });
  assert.deepEqual(forward, backward);
  assert.equal(forward[0]!.quote, 'my shepherd');
  assert.equal(resolveSpan(forward[0]!, psalm[0]!.text, 'kjv').kind, 'exact');
});

test('selecting across verses gives one span per verse', () => {
  const spans = selectionSpans(psalm, 'kjv', { verseIndex: 0, wordIndex: 7 }, { verseIndex: 1, wordIndex: 1 });
  assert.deepEqual(spans.map((s) => s.quote), ['not want', 'He maketh']);
});

test('there are 66 books with 1189 chapters', () => {
  assert.equal(BOOKS.length, 66);
  assert.equal(BOOKS.reduce((sum, b) => sum + b.chapters, 0), 1189);
});

test('references are read the way people type them', () => {
  assert.deepEqual(parseReference('jo 3 16'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('João 3:16'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('jó 1'), { book: 'JOB', chapter: 1 });
  assert.deepEqual(parseReference('1 co 13'), { book: '1CO', chapter: 13 });
  assert.deepEqual(parseReference('1Jo 4.8'), { book: '1JO', chapter: 4, verse: 8 });
  assert.deepEqual(parseReference('sl 23'), { book: 'PSA', chapter: 23 });
  assert.deepEqual(parseReference('apocalipse'), { book: 'REV', chapter: 1 });
  assert.equal(parseReference('sl 151'), null);
  assert.equal(parseReference('graça de Deus'), null);
});

test('search ignores case and accents and respects the limit', () => {
  const chapters = [['No princípio era o Verbo', 'E a GRAÇA abundou'], ['graca sobre graça']];
  assert.deepEqual(searchBook('JOH', chapters, 'graça', 10).map((h) => [h.chapter, h.verse]), [[1, 2], [2, 1]]);
  assert.equal(searchBook('JOH', chapters, 'graca', 1).length, 1);
  assert.deepEqual(searchBook('JOH', chapters, '  ', 10), []);
});

test('books and references work in the three languages', () => {
  assert.equal(bookName('REV', 'en'), 'Revelation');
  assert.equal(bookName('REV', 'es'), 'Apocalipsis');
  assert.equal(bookName('JOH', 'pt'), 'João');
  assert.deepEqual(parseReference('John 3:16', 'en'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('Juan 3 16', 'es'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('Santiago 1', 'es'), { book: 'JAM', chapter: 1 });
  assert.deepEqual(parseReference('Revelation 22', 'en'), { book: 'REV', chapter: 22 });
  assert.deepEqual(parseReference('1 Corinthians 13', 'en'), { book: '1CO', chapter: 13 });
  assert.deepEqual(parseReference('job 1', 'en'), { book: 'JOB', chapter: 1 });
  for (const b of BOOKS) for (const name of Object.values(b.names)) assert.ok(name.length > 0);
});

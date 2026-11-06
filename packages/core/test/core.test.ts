import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOOKS, bookName, marksToPush, mergeMarks, parseReference, searchBook,
  canUse, captureSnapshot, elapsed, goTo, isReadyForPulpit, pace, pause, remaining, resolveSpan, resume,
  selectionSpans, spentInSection, startSession, stepsMissingBaseText, timerState, visibleMarks, wordsOf,
  BOOKS as ALL_BOOKS, addChapter, planChapters, planDayOf, planProgress, PLAN_DAYS, blockBody, estimateSpeechMs, nextStudy, plannedMinutes, stepBlocks, visibleBlocks, TEMPLATES, buildStudy, mergeItems, parsePassage, splitRange, stepBody, stepSuggestions, toLiveSteps, upcoming,
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
  for (const f of ['pulpit', 'snapshot', 'create', 'sync', 'liveClass'] as const) assert.equal(canUse(f, false), false);
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

const dated = (id: string, updatedAt: number | undefined, note: string, deletedAt?: number): Mark => ({
  id, scope: { kind: 'bible' }, spans: [], categoryKey: 'vida', note, updatedAt, deletedAt,
});

test('merging keeps the most recent edit of each mark', () => {
  const merged = mergeMarks([dated('a', 200, 'local'), dated('b', 100, 'old')], [dated('a', 100, 'stale'), dated('b', 300, 'new'), dated('c', 50, 'other')]);
  assert.deepEqual(merged.map((m) => m.note).sort(), ['local', 'new', 'other']);
});

test('a removal wins over an older edit and hides the mark', () => {
  const merged = mergeMarks([dated('a', 100, 'x')], [dated('a', 200, 'x', 200)]);
  assert.equal(merged.length, 1);
  assert.deepEqual(visibleMarks({ kind: 'personal' }, merged), []);
});

test('only changes since the last upload are sent, and undated marks go once', () => {
  const marks = [dated('a', 100, ''), dated('b', 300, ''), dated('c', undefined, '')];
  assert.deepEqual(marksToPush(marks, 0).map((m) => m.id), ['a', 'b', 'c']);
  assert.deepEqual(marksToPush(marks, 200).map((m) => m.id), ['b']);
});

const passage = { book: 'PSA', chapter: 23, from: 1, to: 6, translationId: 'kjv' };
let counter = 0;
const newId = () => `id-${counter++}`;
const ownMark = (id: string, verse: number, categoryKey: string): Mark => ({
  id, scope: { kind: 'bible' }, categoryKey, note: 'minha nota', updatedAt: 5,
  spans: [{ ref: { book: 'PSA', chapter: 23, verse }, translationId: 'kjv' }],
});
const outline = (marks: Mark[] = []) =>
  buildStudy({ id: 's1', kind: 'outline', title: 'Salmo 23', passage, marks, locale: 'pt', now: 100, newId });

test('every template has its sections in the three languages', () => {
  assert.equal(TEMPLATES.length, 5);
  for (const template of TEMPLATES) {
    assert.ok(template.sections.length >= 5, template.kind);
    for (const section of template.sections) {
      for (const locale of ['pt', 'en', 'es'] as const) {
        assert.ok(section.title[locale] && section.guidance[locale], `${template.kind} ${locale}`);
      }
    }
  }
});

test('an outline splits the passage among its points', () => {
  const study = outline();
  const verses = study.steps.map((s) => (s.baseText?.kind === 'scripture' ? s.baseText.spans.map((x) => x.ref.verse) : null));
  assert.deepEqual(verses, [null, [1, 2], [3, 4], [5, 6], null]);
  assert.equal(study.steps.reduce((sum, s) => sum + s.plannedMs, 0), 40 * 60_000);
});

test('splitting never makes an empty part', () => {
  assert.deepEqual(splitRange(4, 4, 3), [[4, 4]]);
  assert.deepEqual(splitRange(1, 7, 3), [[1, 3], [4, 5], [6, 7]]);
});

test('a passage shorter than the points leaves the remaining points for the author', () => {
  const study = buildStudy({ id: 's2', kind: 'outline', title: 'x', passage: { ...passage, to: 2 }, marks: [], locale: 'en', now: 1, newId });
  assert.equal(stepsMissingBaseText(study).length, 3);
  assert.equal(isReadyForPulpit(study), false);
});

test('a new study copies only the marks of its passage, and stays separate from them', () => {
  const inside = ownMark('a', 2, 'significado');
  const outside = { ...ownMark('b', 1, 'promessa'), spans: [{ ref: { book: 'JOH', chapter: 3, verse: 16 }, translationId: 'kjv' }] };
  const removed = { ...ownMark('c', 3, 'aplicacao'), deletedAt: 9 };
  const study = outline([inside, outside, removed]);
  assert.equal(study.snapshot?.marks.length, 1);
  const copy = study.snapshot!.marks[0]!;
  assert.notEqual(copy.id, 'a');
  assert.deepEqual(copy.scope, { kind: 'study', studyId: 's1' });
  copy.note = 'mudou no estudo';
  assert.equal(inside.note, 'minha nota');
});

test('marks feed the sections that use their category', () => {
  const study = outline([ownMark('a', 2, 'significado'), ownMark('b', 4, 'contexto')]);
  assert.deepEqual(stepSuggestions(study, study.steps[0]!).map((m) => m.categoryKey), ['contexto']);
  assert.deepEqual(stepSuggestions(study, study.steps[1]!).map((m) => m.categoryKey), ['significado']);
  assert.equal(stepSuggestions(study, study.steps[4]!).length, 0);
});

test('shorter detail levels fall back to what was written', () => {
  const step = { id: '1', title: 't', notes: 'manuscrito', plannedMs: 1 };
  assert.equal(stepBody(step, 'keywords'), 'manuscrito');
  assert.equal(stepBody({ ...step, outline: 'tópicos' }, 'keywords'), 'tópicos');
  assert.equal(stepBody({ ...step, outline: 'tópicos', keywords: 'chave' }, 'keywords'), 'chave');
  assert.equal(stepBody({ ...step, outline: '  ' }, 'outline'), 'manuscrito');
});

test('private teacher content never reaches a live class', () => {
  const study = outline();
  study.steps[1] = {
    ...study.steps[1]!, notes: 'NOTA-SECRETA', outline: 'TOPICO-SECRETO', keywords: 'CHAVE-SECRETA',
    guidance: 'ORIENTACAO-SECRETA', question: 'O que muda?', expectedAnswer: 'RESPOSTA-SECRETA',
  };
  const sent = JSON.stringify(toLiveSteps(study, () => ({ label: 'Salmos 23', body: 'texto' })));
  assert.match(sent, /O que muda\?/);
  assert.doesNotMatch(sent, /SECRET/);
});

test('upcoming content skips the past and removed items', () => {
  const items = [{ id: 'a', scheduledFor: 30 }, { id: 'b', scheduledFor: 20 }, { id: 'c', scheduledFor: 5 }, { id: 'd', scheduledFor: 40, deletedAt: 1 }, { id: 'e' }];
  assert.deepEqual(upcoming(items, 10).map((i) => i.id), ['b', 'a']);
});

test('studies merge like marks: the latest edit wins', () => {
  const merged = mergeItems([{ id: 'x', updatedAt: 5, title: 'novo' }], [{ id: 'x', updatedAt: 4, title: 'velho' }, { id: 'y', updatedAt: 1, title: 'outro' }]);
  assert.deepEqual(merged.map((s) => s.title), ['novo', 'outro']);
});

test('passages accept a verse range', () => {
  assert.deepEqual(parsePassage('sl 23:1-6'), { book: 'PSA', chapter: 23, verse: 1, to: 6 });
  assert.deepEqual(parsePassage('sl 23'), { book: 'PSA', chapter: 23 });
  assert.equal(parsePassage('sl 23:6-1'), null);
  assert.equal(parsePassage('nada aqui 1'), null);
});

test('recording chapters follow the steps and ignore slips', () => {
  let chapters = addChapter([], 0, 0);
  chapters = addChapter(chapters, 60_000, 1);
  chapters = addChapter(chapters, 60_000, 1);
  assert.deepEqual(chapters.map((c) => c.stepIndex), [0, 1]);
  chapters = addChapter(chapters, 60_400, 2);
  assert.deepEqual(chapters, [{ atMs: 0, stepIndex: 0 }, { atMs: 60_000, stepIndex: 2 }]);
});

test('the year plan covers every chapter once, in order', () => {
  const all = Array.from({ length: PLAN_DAYS }, (_, day) => planChapters(day)).flat();
  assert.equal(all.length, ALL_BOOKS.reduce((sum, book) => sum + book.chapters, 0));
  assert.equal(new Set(all.map((c) => `${c.book} ${c.chapter}`)).size, all.length);
  assert.deepEqual(all[0], { book: 'GEN', chapter: 1 });
  assert.equal(all[all.length - 1]!.book, 'REV');
  for (let day = 0; day < PLAN_DAYS; day++) assert.ok(planChapters(day).length >= 3 && planChapters(day).length <= 4, String(day));
});

test('the plan follows the calendar and never leaves its range', () => {
  const start = new Date(2026, 0, 1, 22).getTime();
  assert.equal(planDayOf(start, new Date(2026, 0, 1, 23).getTime()), 0);
  assert.equal(planDayOf(start, new Date(2026, 0, 2, 1).getTime()), 1);
  assert.equal(planDayOf(start, new Date(2030, 0, 1).getTime()), PLAN_DAYS - 1);
  assert.equal(planProgress([0, 1, 1, 2]), 3 / PLAN_DAYS);
});

test('the next content is the soonest dated one, else the latest edit', () => {
  const items = [
    { id: 'old', updatedAt: 1 }, { id: 'new', updatedAt: 9 }, { id: 'later', scheduledFor: 500, updatedAt: 2 },
    { id: 'soon', scheduledFor: 200, updatedAt: 3 }, { id: 'past', scheduledFor: 10_000, updatedAt: 4 }, { id: 'gone', scheduledFor: 150, deletedAt: 1 },
  ];
  assert.equal(nextStudy(items, 100)?.id, 'soon');
  assert.equal(nextStudy(items.filter((i) => !i.scheduledFor), 100)?.id, 'new');
  assert.equal(nextStudy([], 100), undefined);
  assert.equal(nextStudy([{ id: 'x', scheduledFor: 5, updatedAt: 1 }, { id: 'y', updatedAt: 7 }], 7_200_000)?.id, 'y');
});

test('steps saved before blocks keep their notes and question as blocks', () => {
  const old = { id: 's', title: 't', notes: 'o que dizer', question: 'e você?', expectedAnswer: 'sim', plannedMs: 1 };
  assert.deepEqual(stepBlocks(old).map((b) => b.kind), ['idea', 'question']);
  assert.equal(stepBlocks(old)[1]!.expectedAnswer, 'sim');
  assert.deepEqual(stepBlocks({ ...old, blocks: [] }), []);
});

test('empty blocks stay out of the Pulpit, except an activity with its timer', () => {
  const step = { id: 's', title: 't', notes: '', plannedMs: 1, blocks: [
    { id: 'a', kind: 'idea' as const, text: '  ' }, { id: 'b', kind: 'illustration' as const, text: 'uma história' }, { id: 'c', kind: 'activity' as const, text: '' },
  ] };
  assert.deepEqual(visibleBlocks(step).map((b) => b.id), ['b', 'c']);
});

test('an idea shows its shorter versions and falls back to what was written', () => {
  const idea = { id: 'i', kind: 'idea' as const, text: 'texto longo', outline: 'tópicos', keywords: 'chave' };
  assert.equal(blockBody(idea, 'manuscript'), 'texto longo');
  assert.equal(blockBody(idea, 'outline'), 'tópicos');
  assert.equal(blockBody(idea, 'keywords'), 'chave');
  assert.equal(blockBody({ ...idea, outline: undefined, keywords: undefined }, 'keywords'), 'texto longo');
  assert.equal(blockBody({ ...idea, kind: 'question', outline: 'x' }, 'outline'), 'texto longo');
});

test('the time to say a step comes from its words, and an activity counts its own timer', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'palavra').join(' ');
  const step = { id: 's', title: 't', notes: '', plannedMs: 1, blocks: [{ id: 'a', kind: 'idea' as const, text: words(260) }, { id: 'b', kind: 'activity' as const, text: '', minutes: 4 }] };
  assert.equal(estimateSpeechMs(step), 2 * 60_000 + 4 * 60_000);
  assert.equal(estimateSpeechMs({ ...step, baseText: { kind: 'authored', text: 'frase' } }), 2 * 60_000 + 4 * 60_000 + 30_000);
  assert.equal(plannedMinutes({ id: 'x', title: 'x', steps: [{ ...step, plannedMs: 600_000 }, { ...step, plannedMs: 300_000 }] }), 15);
});

test('templates start each section with its blocks, and nothing private goes to a live class', () => {
  const study = buildStudy({ id: 'b1', kind: 'class', title: 'x', passage, marks: [], locale: 'pt', now: 1, newId });
  assert.deepEqual(study.steps[0]!.blocks!.map((b) => b.kind), ['question']);
  assert.deepEqual(study.steps[4]!.blocks!.map((b) => b.kind), ['activity']);
  study.steps[2] = { ...study.steps[2]!, blocks: [
    { id: 'i', kind: 'idea', text: 'IDEIA-SECRETA' }, { id: 'q', kind: 'question', text: 'Que verbos?', expectedAnswer: 'RESPOSTA-SECRETA' },
    { id: 'l', kind: 'illustration', text: 'HISTORIA-SECRETA' },
  ] };
  const sent = JSON.stringify(toLiveSteps(study, () => ({ label: 'x', body: 'y' })));
  assert.match(sent, /Que verbos/);
  assert.doesNotMatch(sent, /SECRETA/);
});

test('every verse of the day points to a real book and chapter', async () => {
  const { DAILY_VERSES, BOOKS: books } = await import('../src/index.ts');
  assert.ok(DAILY_VERSES.length >= 30);
  for (const [book, chapter, verse] of DAILY_VERSES) {
    const found = books.find((b) => b.id === book);
    assert.ok(found, `unknown book ${book}`);
    assert.ok(chapter >= 1 && chapter <= found.chapters, `${book} ${chapter}`);
    assert.ok(verse >= 1, `${book} ${chapter}:${verse}`);
  }
});

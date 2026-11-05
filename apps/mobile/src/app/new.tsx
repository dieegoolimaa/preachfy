import {
  bookName, buildStudy, marksInPassage, parsePassage, TEMPLATES, templateFor,
  type Mark, type Passage, type Step, type StudyKind,
} from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { FadeIn, Field, Hint, IconButton, Pill, Screen, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { saveStudy, useReader } from '@/lib/store';
import { categoryColor, paper, serif, serifBold } from '@/lib/theme';

type Draft = { step: Step; on: boolean };
type Stage = 1 | 2 | 3;

const verseOf = (mark: Mark) => mark.spans[0]?.ref.verse ?? 0;

/** Passage, type and steps, one at a time. The header always shows where you are. */
export default function NewContent() {
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ passage?: string }>();
  const { book, chapter, translation, marks } = useReader();
  // Coming from a selection in the Bible, the passage is already chosen.
  const [stage, setStage] = useState<Stage>(params.passage ? 2 : 1);
  const [reference, setReference] = useState(params.passage ?? `${bookName(book, locale)} ${chapter}`);
  const [verses, setVerses] = useState<string[]>([]);
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [kind, setKind] = useState<StudyKind>('outline');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState<Draft[]>([]);

  const parsed = useMemo(() => parsePassage(reference, locale), [reference, locale]);
  const chapterKey = parsed ? `${parsed.book}-${parsed.chapter}` : '';

  useEffect(() => {
    let live = true;
    if (!parsed) {
      setVerses([]);
      setRange(null);
      return;
    }
    loadBook(translation, parsed.book).then((chapters) => {
      if (!live) return;
      const text = chapters[parsed.chapter - 1] ?? [];
      setVerses(text);
      const from = parsed.verse ?? 1;
      const to = Math.min(parsed.to ?? parsed.verse ?? text.length, text.length);
      setRange(text.length && from <= to ? { a: from, b: to } : null);
      setAnchor(null);
    });
    return () => {
      live = false;
    };
    // The chapter and the verses typed decide the range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, translation]);

  const passage: Passage | null =
    parsed && range ? { book: parsed.book, chapter: parsed.chapter, from: range.a, to: range.b, translationId: translation } : null;
  const own = passage ? marksInPassage(marks, passage) : [];
  const label = passage ? `${bookName(passage.book, locale)} ${passage.chapter}:${passage.from}–${passage.to}` : '';
  const template = templateFor(kind);

  useEffect(() => {
    if (!passage) {
      setDraft([]);
      return;
    }
    const base = buildStudy({ id: 'draft', kind, title: '', passage, marks: [], locale, now: 0, newId });
    setDraft(base.steps.map((step) => ({ step, on: true })));
    // Steps follow the passage and the type, so edits start again when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterKey, range?.a, range?.b, kind, locale]);

  const tap = (verse: number) => {
    if (anchor === null) {
      setAnchor(verse);
      setRange({ a: verse, b: verse });
    } else {
      setRange({ a: Math.min(anchor, verse), b: Math.max(anchor, verse) });
      setAnchor(null);
    }
  };

  const change = (index: number, patch: { on?: boolean; title?: string }) =>
    setDraft((rows) =>
      rows.map((row, i) => (i === index ? { step: patch.title === undefined ? row.step : { ...row.step, title: patch.title }, on: patch.on ?? row.on } : row)),
    );

  const move = (index: number, delta: number) =>
    setDraft((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const remove = (index: number) => setDraft((rows) => rows.filter((_, i) => i !== index));

  /** Points are as many as the author wants: a new one continues the numbering. */
  const add = () =>
    setDraft((rows) => {
      const point = templateFor(kind).sections.find((x) => x.range === 'part');
      const word = point?.title[locale].replace(/\s*\d+$/, '');
      const count = word ? rows.filter((row) => row.step.title.startsWith(word)).length : 0;
      const name = word ? `${word} ${count + 1}` : t('newStep');
      return [...rows, { step: { id: newId(), title: name, notes: '', plannedMs: 600_000 }, on: true }];
    });

  const kept = draft.filter((row) => row.on);
  const minutes = Math.round(kept.reduce((sum, row) => sum + row.step.plannedMs, 0) / 60_000);

  const create = () => {
    if (!passage || kept.length === 0) return;
    const id = newId();
    const base = buildStudy({ id, kind, title: title.trim() || label, passage, marks, locale, now: Date.now(), newId });
    saveStudy({ ...base, steps: kept.map((row) => row.step) });
    router.replace(`/study/${id}`);
  };

  const dotsFor = (step: Step) => {
    const verseList = step.baseText?.kind === 'scripture' ? step.baseText.spans.map((x) => x.ref.verse) : null;
    return own.filter((m) => step.feeds?.includes(m.categoryKey) && (!verseList || verseList.includes(verseOf(m))));
  };

  const header = (
    <View style={s.wizard} testID="wizard">
      {([['wizPassage', 1], ['wizType', 2], ['wizSteps', 3]] as const).map(([key, number], index) => {
        const done = number < stage;
        const now = number === stage;
        const reachable = number <= stage && (number === 1 || Boolean(passage));
        return (
          <View key={key} style={s.wizItem}>
            {index ? <View style={s.wizLine} /> : null}
            <Pressable testID={`wiz-${number}`} accessibilityRole="button" disabled={!reachable} style={s.wizStep} onPress={() => setStage(number)}>
              <View style={[s.wizDot, done && s.wizDone, now && s.wizNow]}>
                {done ? <Icon name="check" size={12} color={paper.accentFg} /> : <Text style={[s.wizNumber, now && s.wizNumberNow]}>{number}</Text>}
              </View>
              <Text style={[s.wizLabel, now && s.wizLabelNow]}>{t(key)}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  const summary = passage ? (
    <Pressable testID="passage-summary" accessibilityRole="button" style={s.summary} onPress={() => setStage(1)}>
      <Text style={s.summaryText}>{label}{own.length ? ` · ${t('marksFound', { n: own.length })}` : ''}</Text>
      <Text style={s.summaryAction}>{t('changePassage')}</Text>
    </Pressable>
  ) : null;

  let footer: ReactNode = null;
  if (stage === 1) {
    footer = <Pill testID="wiz-continue" primary big disabled={!passage} label={passage ? t('continueWith', { label }) : t('continue')} onPress={() => setStage(2)} />;
  } else if (stage === 3) {
    footer = (
      <Pill testID="create-study" primary big disabled={!passage || kept.length === 0} label={t('createKind', { kind: template.name[locale].toLowerCase(), n: minutes })} onPress={create} />
    );
  }

  return (
    <Screen title={t('newContent')} close footer={footer} testID="new">
      {header}
      <FadeIn key={stage}>
        {stage === 1 ? (
          <View style={s.column}>
            <Field testID="passage" value={reference} onChangeText={setReference} placeholder={t('passageHint')} autoCorrect={false} />
            {passage ? (
              <Hint testID="passage-ok">{label}{own.length ? ` · ${t('marksFound', { n: own.length })}` : ''}</Hint>
            ) : (
              <Text testID="passage-error" style={ui.error}>{t('passageInvalid')}</Text>
            )}
            <Hint>{anchor === null ? t('pickVerseStart') : t('pickVerseEnd')}</Hint>
            {verses.length ? <Pill plain testID="whole-chapter" label={t('wholeChapter')} onPress={() => { setRange({ a: 1, b: verses.length }); setAnchor(null); }} /> : null}
            <View style={s.verses}>
              {verses.map((text, index) => {
                const number = index + 1;
                const on = range ? number >= range.a && number <= range.b : false;
                const dots = marks.filter((m) => !m.deletedAt && m.scope.kind === 'bible' && m.spans.some((x) => x.ref.book === parsed?.book && x.ref.chapter === parsed?.chapter && x.ref.verse === number));
                return (
                  <Pressable key={number} testID={`pick-${number}`} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.verse, on && s.verseOn]} onPress={() => tap(number)}>
                    <Text style={s.number}>{number}</Text>
                    <Text style={s.verseText}>
                      {text}
                      {dots.map((m) => <Text key={m.id} style={{ color: categoryColor(m.categoryKey) }}>{' ●'}</Text>)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {stage === 2 ? (
          <View style={s.column}>
            {summary}
            <Text style={s.question}>{t('step2Type')}</Text>
            <View style={s.kinds}>
              {TEMPLATES.map((item) => {
                const total = Math.round(item.sections.reduce((sum, x) => sum + x.minutes, 0));
                return (
                  <Pressable
                    key={item.kind}
                    testID={`kind-${item.kind}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kind === item.kind }}
                    style={[s.kind, kind === item.kind && s.kindOn]}
                    onPress={() => {
                      setKind(item.kind);
                      setStage(3);
                    }}>
                    <Text style={[s.kindName, kind === item.kind && s.kindNameOn]}>{item.name[locale]}</Text>
                    <Text style={[s.kindMeta, kind === item.kind && s.kindMetaOn]}>{t('kindMeta', { role: item.role[locale], n: total })}</Text>
                  </Pressable>
                );
              })}
              <Pressable testID="kind-card" accessibilityRole="button" disabled={!passage} style={[s.kind, !passage && ui.off]} onPress={() => router.replace({ pathname: '/card', params: { reference } })}>
                <Text style={s.kindName}>{t('verseCard')}</Text>
                <Text style={s.kindMeta}>{t('shareLabel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {stage === 3 ? (
          <View style={s.column}>
            {summary}
            <Field testID="title" value={title} onChangeText={setTitle} placeholder={label || t('titleLabel')} />
            <Hint testID="sections-count">{t('sectionsOn', { n: kept.length, m: draft.length })} · {t('minutes', { n: minutes })}</Hint>
            {draft.map((row, index) => {
              const found = dotsFor(row.step);
              const spans = row.step.baseText?.kind === 'scripture' ? row.step.baseText.spans : null;
              return (
                <View key={row.step.id} testID={`draft-${index}`} style={[s.section, !row.on && s.sectionOff]}>
                  <Pressable testID={`draft-toggle-${index}`} accessibilityRole="checkbox" accessibilityState={{ checked: row.on }} style={[s.check, row.on && s.checkOn]} onPress={() => change(index, { on: !row.on })}>
                    {row.on ? <Icon name="check" size={16} color={paper.accentFg} /> : null}
                  </Pressable>
                  <View style={s.sectionBody}>
                    <TextInput testID={`draft-title-${index}`} style={s.sectionTitle} value={row.step.title} onChangeText={(text) => change(index, { title: text })} />
                    <View style={s.meta}>
                      <View style={s.chips}>
                        <Text style={s.chip}>{t('minutes', { n: Math.round(row.step.plannedMs / 60_000) })}</Text>
                        {spans?.length ? <Text style={s.chip}>{`${bookName(spans[0]!.ref.book, locale)} ${spans[0]!.ref.chapter}:${spans[0]!.ref.verse}${spans.length > 1 ? `–${spans[spans.length - 1]!.ref.verse}` : ''}`}</Text> : null}
                      </View>
                      <View style={s.controls}>
                        <IconButton testID={`draft-up-${index}`} icon="arrow-up" label={t('previous')} disabled={index === 0} onPress={() => move(index, -1)} />
                        <IconButton testID={`draft-down-${index}`} icon="arrow-down" label={t('next')} disabled={index === draft.length - 1} onPress={() => move(index, 1)} />
                        <IconButton testID={`draft-remove-${index}`} icon="close" color={paper.muted} label={t('remove')} onPress={() => remove(index)} />
                      </View>
                    </View>
                    {found.length ? (
                      <View style={s.chips}>
                        <Text style={s.from}>{t('fromYourStudyShort')}</Text>
                        {found.map((m) => (
                          <Text key={m.id} style={s.from}>
                            <Text style={{ color: categoryColor(m.categoryKey) }}>● </Text>{t(`cat${m.categoryKey}` as Parameters<typeof t>[0])} {t('verseAbbr')}{verseOf(m)}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
            <Pill testID="draft-add" plain label={t('addStep')} onPress={add} />
          </View>
        ) : null}
      </FadeIn>
    </Screen>
  );
}

const s = StyleSheet.create({
  wizard: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  wizItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  wizLine: { flex: 1, height: 1.5, marginHorizontal: 8, backgroundColor: paper.line },
  wizStep: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  wizDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: paper.line, alignItems: 'center', justifyContent: 'center' },
  wizDone: { backgroundColor: paper.accent, borderColor: paper.accent },
  wizNow: { borderColor: paper.fg },
  wizNumber: { fontSize: 11, fontWeight: '700', color: paper.muted },
  wizNumberNow: { color: paper.fg },
  wizLabel: { fontSize: 13, color: paper.muted },
  wizLabelNow: { color: paper.fg, fontWeight: '700' },
  summary: { gap: 2, paddingVertical: 4 },
  summaryText: { fontFamily: serifBold, fontSize: 22, color: paper.fg },
  summaryAction: { fontSize: 14, color: paper.muted, textDecorationLine: 'underline' },
  question: { fontFamily: serifBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.3, color: paper.fg },
  column: { gap: 12 },
  verses: { gap: 2 },
  verse: { flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderLeftWidth: 4, borderLeftColor: 'transparent', borderRadius: 4 },
  verseOn: { backgroundColor: paper.soft, borderLeftColor: paper.mark },
  number: { width: 22, fontSize: 12, fontWeight: '600', color: paper.muted, paddingTop: 5 },
  verseText: { flex: 1, fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
  kinds: { gap: 10 },
  kind: { gap: 2, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: paper.line },
  kindOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  kindName: { fontFamily: serifBold, fontSize: 22, color: paper.fg },
  kindNameOn: { color: paper.accentFg },
  kindMeta: { fontSize: 14, color: paper.muted },
  kindMetaOn: { color: '#FFFFFFB3' },
  section: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  sectionOff: { opacity: 0.45 },
  check: { width: 26, height: 26, marginTop: 2, borderRadius: 13, borderWidth: 1.5, borderColor: paper.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  sectionBody: { flex: 1, minWidth: 0, gap: 4 },
  sectionTitle: { fontFamily: serifBold, fontSize: 20, color: paper.fg, paddingVertical: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  controls: { flexDirection: 'row', marginRight: -8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { fontSize: 12, color: paper.fg, backgroundColor: paper.soft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  from: { fontSize: 12, color: paper.muted },
});

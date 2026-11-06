import {
  bookName, buildStudy, marksInPassage, parsePassage, passageText, TEMPLATES,
  type Mark, type Passage, type Step, type StudyKind,
} from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { FadeIn, Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { saveStudy, useReader } from '@/lib/store';
import { categoryColor, paper, serif, serifBold } from '@/lib/theme';

type Stage = 1 | 2;

/** Passage, then what it will become. Creation opens empty, with only the passage in it. */
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

  const parsed = useMemo(() => parsePassage(reference, locale), [reference, locale]);

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

  const tap = (verse: number) => {
    if (anchor === null) {
      setAnchor(verse);
      setRange({ a: verse, b: verse });
    } else {
      setRange({ a: Math.min(anchor, verse), b: Math.max(anchor, verse) });
      setAnchor(null);
    }
  };

  /** Everything starts empty: the passage is the base text and the rest is up to the author. */
  const create = (kind: StudyKind) => {
    if (!passage) return;
    const id = newId();
    const base = buildStudy({ id, kind, title: label, passage, marks, locale, now: Date.now(), newId });
    // The message is always: the Bible text, an introduction, the steps the author adds, and a conclusion.
    const intro: Step = { id: newId(), title: t('introTitle'), role: 'intro', notes: '', plannedMs: 5 * 60_000, baseText: passageText(passage), blocks: [{ id: newId(), kind: 'idea', text: '' }] };
    const end: Step = { id: newId(), title: t('conclusionTitle'), role: 'conclusion', notes: '', plannedMs: 5 * 60_000, blocks: [{ id: newId(), kind: 'idea', text: '' }] };
    saveStudy({ ...base, steps: [intro, end] });
    router.replace(`/study/${id}`);
  };

  const header = (
    <View style={s.wizard} testID="wizard">
      {([['wizPassage', 1], ['wizType', 2]] as const).map(([key, number], index) => {
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

  const footer: ReactNode =
    stage === 1 ? <Pill testID="wiz-continue" primary big disabled={!passage} label={passage ? t('continueWith', { label }) : t('continue')} onPress={() => setStage(2)} /> : null;

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
                      {dots.map((m: Mark) => <Text key={m.id} style={{ color: categoryColor(m.categoryKey) }}>{' ●'}</Text>)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={s.column}>
            {summary}
            <Text style={s.question}>{t('step2Type')}</Text>
            <View style={s.kinds}>
              {TEMPLATES.map((item) => (
                <Pressable key={item.kind} testID={`kind-${item.kind}`} accessibilityRole="button" disabled={!passage} style={s.kind} onPress={() => create(item.kind)}>
                  <Text style={s.kindName}>{item.name[locale]}</Text>
                  <Text style={s.kindMeta}>{item.role[locale]}</Text>
                </Pressable>
              ))}
              <Pressable testID="kind-card" accessibilityRole="button" disabled={!passage} style={[s.kind, !passage && ui.off]} onPress={() => router.replace({ pathname: '/card', params: { reference } })}>
                <Text style={s.kindName}>{t('verseCard')}</Text>
                <Text style={s.kindMeta}>{t('shareLabel')}</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  kindName: { fontFamily: serifBold, fontSize: 22, color: paper.fg },
  kindMeta: { fontSize: 14, color: paper.muted },
});

import {
  bookName, buildStudy, marksInPassage, parsePassage, TEMPLATES, templateFor,
  type Mark, type Passage, type Step, type StudyKind,
} from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Field, Hint, IconButton, Pill, Screen, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { resolvePassage } from '@/lib/passage';
import { saveStudy, useReader } from '@/lib/store';
import { categoryColor, paper, serif, serifBold } from '@/lib/theme';

type Draft = { step: Step; on: boolean };

const verseOf = (mark: Mark) => mark.spans[0]?.ref.verse ?? 0;

/** Passage, type and sections on one screen. Change the passage and the sections rebuild. */
export default function NewContent() {
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ passage?: string }>();
  const { book, chapter, translation, marks } = useReader();
  const [reference, setReference] = useState(params.passage ?? `${bookName(book, locale)} ${chapter}`);
  const [verses, setVerses] = useState<string[]>([]);
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [kind, setKind] = useState<StudyKind>('outline');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState<Draft[]>([]);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  // On a phone the verses fold away once the passage is chosen, so the next steps stay in view.
  const [pickerOpen, setPickerOpen] = useState(false);
  const showVerses = wide || pickerOpen;

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

  useEffect(() => {
    if (!passage) {
      setDraft([]);
      return;
    }
    const base = buildStudy({ id: 'draft', kind, title: '', passage, marks: [], locale, now: 0, newId });
    setDraft(base.steps.map((step) => ({ step, on: true })));
    // Sections follow the passage and the type, so edits start again when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterKey, range?.a, range?.b, kind, locale]);

  const tap = (verse: number) => {
    if (anchor === null) {
      setAnchor(verse);
      setRange({ a: verse, b: verse });
    } else {
      setRange({ a: Math.min(anchor, verse), b: Math.max(anchor, verse) });
      setAnchor(null);
      setPickerOpen(false);
    }
  };

  const change = (index: number, patch: Partial<Draft> & { title?: string }) =>
    setDraft((rows) => rows.map((row, i) => (i === index ? { step: patch.title === undefined ? row.step : { ...row.step, title: patch.title }, on: patch.on ?? row.on } : row)));

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
      const title = word ? `${word} ${count + 1}` : t('newStep');
      return [...rows, { step: { id: newId(), title, notes: '', plannedMs: 600_000 }, on: true }];
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
    const range = step.baseText?.kind === 'scripture' ? step.baseText.spans.map((x) => x.ref.verse) : null;
    return own.filter((m) => step.feeds?.includes(m.categoryKey) && (!range || range.includes(verseOf(m))));
  };

  const picker = (
    <View style={s.column}>
      <Text style={ui.fieldLabel}>{t('step1Passage')}</Text>
      <Field testID="passage" value={reference} onChangeText={setReference} placeholder={t('passageHint')} autoCorrect={false} />
      {passage ? (
        <Hint testID="passage-ok">{label}{own.length ? ` · ${t('marksFound', { n: own.length })}` : ''}</Hint>
      ) : (
        <Text testID="passage-error" style={ui.error}>{t('passageInvalid')}</Text>
      )}
      {!wide && passage ? (
        <Pressable testID="picker-toggle" accessibilityRole="button" style={s.summary} onPress={() => setPickerOpen(!pickerOpen)}>
          <Text style={s.summaryText}>{pickerOpen ? t('pickVerseStart') : t('changePassage')}</Text>
          <Icon name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={paper.muted} />
        </Pressable>
      ) : null}
      {showVerses ? <Hint>{anchor === null ? t('pickVerseStart') : t('pickVerseEnd')}</Hint> : null}
      {showVerses && verses.length ? <Pill plain testID="whole-chapter" label={t('wholeChapter')} onPress={() => { setRange({ a: 1, b: verses.length }); setAnchor(null); setPickerOpen(false); }} /> : null}
      <View style={s.verses}>
        {(showVerses ? verses : []).map((text, index) => {
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
  );

  const builder = (
    <View style={s.column}>
      <Text style={ui.fieldLabel}>{t('step2Type')}</Text>
      <View style={s.kinds}>
        {TEMPLATES.map((template) => {
          const total = Math.round(template.sections.reduce((sum, x) => sum + x.minutes, 0));
          return (
            <Pressable key={template.kind} testID={`kind-${template.kind}`} accessibilityRole="button" accessibilityState={{ selected: kind === template.kind }} style={[s.kind, kind === template.kind && s.kindOn]} onPress={() => setKind(template.kind)}>
              <Text style={[s.kindName, kind === template.kind && s.kindNameOn]}>{template.name[locale]}</Text>
              <Text style={[s.kindMeta, kind === template.kind && s.kindMetaOn]}>{t('kindMeta', { role: template.role[locale], n: total })}</Text>
            </Pressable>
          );
        })}
        <Pressable testID="kind-card" accessibilityRole="button" disabled={!passage} style={[s.kind, !passage && ui.off]} onPress={() => router.replace({ pathname: '/card', params: { reference } })}>
          <Text style={s.kindName}>{t('verseCard')}</Text>
          <Text style={s.kindMeta}>{t('shareLabel')}</Text>
        </Pressable>
      </View>

      <Text style={ui.fieldLabel}>{t('step3Title')}</Text>
      <Field testID="title" value={title} onChangeText={setTitle} placeholder={label || t('titleLabel')} />
      <Hint testID="sections-count">{t('sectionsOn', { n: kept.length, m: draft.length })} · {t('minutes', { n: minutes })}</Hint>

      {draft.map((row, index) => {
        const found = dotsFor(row.step);
        const range = row.step.baseText?.kind === 'scripture' ? row.step.baseText.spans : null;
        return (
          <View key={`${row.step.id}`} testID={`draft-${index}`} style={[s.section, !row.on && s.sectionOff]}>
            <Pressable testID={`draft-toggle-${index}`} accessibilityRole="checkbox" accessibilityState={{ checked: row.on }} style={[s.check, row.on && s.checkOn]} onPress={() => change(index, { on: !row.on })}>
              {row.on ? <Icon name="check" size={16} color={paper.accentFg} /> : null}
            </Pressable>
            <View style={s.sectionBody}>
              <TextInput testID={`draft-title-${index}`} style={s.sectionTitle} value={row.step.title} onChangeText={(text) => change(index, { title: text })} />
              <View style={s.meta}>
              <View style={s.chips}>
                <Text style={s.chip}>{t('minutes', { n: Math.round(row.step.plannedMs / 60_000) })}</Text>
                {range?.length ? <Text style={s.chip}>{`${bookName(range[0]!.ref.book, locale)} ${range[0]!.ref.chapter}:${range[0]!.ref.verse}${range.length > 1 ? `–${range[range.length - 1]!.ref.verse}` : ''}`}</Text> : null}
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
      <Pill testID="create-study" primary big disabled={!passage || kept.length === 0} label={t('createNow')} onPress={create} />
    </View>
  );

  return (
    <Screen title={t('newContent')} close wide testID="new">
      {wide ? <View style={s.two}><View style={s.left}>{picker}</View><View style={s.right}>{builder}</View></View> : <>{picker}{builder}</>}
    </Screen>
  );
}

const s = StyleSheet.create({
  two: { flexDirection: 'row', gap: 40, alignItems: 'flex-start' },
  left: { flex: 1, minWidth: 0 },
  right: { flex: 1.3, minWidth: 0 },
  column: { gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: paper.soft },
  summaryText: { flex: 1, fontSize: 15, color: paper.fg },
  verses: { gap: 2 },
  verse: { flexDirection: 'row', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderLeftWidth: 4, borderLeftColor: 'transparent', borderRadius: 4 },
  verseOn: { backgroundColor: paper.soft, borderLeftColor: paper.mark },
  number: { width: 22, fontSize: 12, fontWeight: '600', color: paper.muted, paddingTop: 5 },
  verseText: { flex: 1, fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kind: { flexGrow: 1, flexBasis: 150, gap: 2, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: paper.line },
  kindOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  kindName: { fontFamily: serifBold, fontSize: 18, color: paper.fg },
  kindNameOn: { color: paper.accentFg },
  kindMeta: { fontSize: 13, color: paper.muted },
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

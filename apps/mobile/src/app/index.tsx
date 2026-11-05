import {
  bookById, bookName, canUse, resolveSpan, selectionSpans, visibleMarks,
  type Mark, type ReadingLayer, type VerseSpan, type VerseText, type WordPoint,
} from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Verse } from '@/components/Verse';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { updateReader, useReader } from '@/lib/store';
import { categories, paper, serifBold } from '@/lib/theme';
import { translationById, translations } from '@/lib/translations';

const order = (p: WordPoint) => p.verseIndex * 10_000 + p.wordIndex;

function verseLabel(spans: VerseSpan[]) {
  const first = spans[0]?.ref.verse;
  const last = spans[spans.length - 1]?.ref.verse;
  return first === last ? `${first}` : `${first}–${last}`;
}

export default function Reader() {
  const { translation, book, chapter, verse: focusVerse, marks } = useReader();
  const { t, locale } = useT();
  const [chapters, setChapters] = useState<string[][] | null>(null);
  const [failed, setFailed] = useState(false);
  const [layer, setLayer] = useState<ReadingLayer>({ kind: 'personal' });
  const [anchor, setAnchor] = useState<WordPoint | null>(null);
  const [focus, setFocus] = useState<WordPoint | null>(null);
  const [notice, setNotice] = useState('');
  const list = useRef<FlatList<VerseText>>(null);

  const info = bookById(book)!;
  const title = bookName(book, locale);
  const version = translationById(translation);

  useEffect(() => {
    let live = true;
    setChapters(null);
    setFailed(false);
    loadBook(translation, book)
      .then((data) => live && setChapters(data))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [translation, book]);

  useEffect(() => {
    setAnchor(null);
    setFocus(null);
    setNotice('');
  }, [translation, book, chapter]);

  const verses = useMemo<VerseText[]>(
    () => (chapters?.[chapter - 1] ?? []).map((text, i) => ({ ref: { book, chapter, verse: i + 1 }, text })),
    [chapters, book, chapter],
  );

  useEffect(() => {
    if (focusVerse && verses.length >= focusVerse) {
      const id = setTimeout(() => list.current?.scrollToIndex({ index: focusVerse - 1, animated: false, viewPosition: 0.2 }), 50);
      return () => clearTimeout(id);
    }
  }, [focusVerse, verses]);

  const shown = useMemo(() => visibleMarks(layer, marks), [layer, marks]);
  const spans = anchor ? selectionSpans(verses, translation, anchor, focus ?? anchor) : [];
  const quoted = spans.map((s) => s.quote).join(' ');
  const reference = spans.length ? `${title} ${chapter}:${verseLabel(spans)} · ${version.short}` : '';

  const widened = useMemo(() => {
    let count = 0;
    for (const mark of shown) {
      for (const span of mark.spans) {
        const verse = verses[span.ref.verse - 1];
        if (span.ref.book !== book || span.ref.chapter !== chapter || !verse || span.start === undefined) continue;
        if (resolveSpan(span, verse.text, translation).kind === 'wholeVerse') count++;
      }
    }
    return count;
  }, [shown, verses, book, chapter, translation]);

  const clear = () => {
    setAnchor(null);
    setFocus(null);
  };

  const press = (point: WordPoint) => {
    setNotice('');
    if (!anchor || focus) {
      setAnchor(point);
      setFocus(null);
    } else {
      setFocus(point);
    }
  };

  const isSelected = (verseIndex: number, wordIndex: number) => {
    if (!anchor) return false;
    const end = focus ?? anchor;
    const at = order({ verseIndex, wordIndex });
    return at >= Math.min(order(anchor), order(end)) && at <= Math.max(order(anchor), order(end));
  };

  const mark = (categoryKey: string) => {
    if (!canUse('simpleMark', false)) return;
    const created: Mark = { id: `${Date.now()}-${marks.length}`, scope: { kind: 'bible' }, spans, categoryKey, note: '' };
    updateReader({ marks: [...marks, created] });
    setNotice(t('markSaved'));
    clear();
  };

  const copy = async () => {
    await Clipboard.setStringAsync(`“${quoted}” ${reference}`);
    setNotice(t('copied'));
  };

  const share = async () => {
    const message = `“${quoted}” ${reference}\nPreachfy`;
    if (Platform.OS === 'web' && !('share' in navigator)) {
      await Clipboard.setStringAsync(message);
      setNotice(t('copiedToShare'));
      return;
    }
    await Share.share({ message });
  };

  const nextVersion = () => {
    const at = translations.findIndex((t) => t.id === translation);
    updateReader({ translation: translations[(at + 1) % translations.length]!.id });
  };

  const turn = (delta: number) => {
    updateReader({ chapter: chapter + delta, verse: undefined });
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const clean = layer.kind === 'clean';
  const hint = notice || t(anchor ? 'tapEnd' : 'tapStart');

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable testID="open-picker" accessibilityRole="button" onPress={() => router.push('/picker')}>
          <Text testID="reader-title" style={styles.title}>{title} {chapter}</Text>
        </Pressable>
        <View style={styles.row}>
          <Pressable testID="open-search" style={styles.pill} onPress={() => router.push('/search')}>
            <Text style={styles.pillText}>{t('search')}</Text>
          </Pressable>
          <Pressable testID="open-pulpit" style={[styles.pill, styles.pillOn]} onPress={() => router.push('/pulpit')}>
            <Text style={[styles.pillText, styles.pillTextOn]}>{t('pulpit')}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tools}>
        <Pressable testID="translation" style={styles.pill} onPress={nextVersion}>
          <Text style={styles.pillText}>{version.short}</Text>
        </Pressable>
        <Pressable
          testID="toggle-clean"
          style={[styles.pill, clean && styles.pillOn]}
          onPress={() => setLayer(clean ? { kind: 'personal' } : { kind: 'clean' })}>
          <Text style={[styles.pillText, clean && styles.pillTextOn]}>{t('clean')}</Text>
        </Pressable>
        <Pressable testID="open-about" style={styles.pill} onPress={() => router.push('/about')}>
          <Text style={styles.pillText}>{t('about')}</Text>
        </Pressable>
      </View>

      {failed ? <Text style={styles.message}>{t('openFailed')}</Text> : null}
      {!chapters && !failed ? <Text style={styles.message}>{t('opening')}</Text> : null}

      <FlatList
        ref={list}
        testID="verses"
        style={styles.list}
        contentContainerStyle={styles.text}
        data={verses}
        extraData={[anchor, focus, shown, translation]}
        keyExtractor={(v) => String(v.ref.verse)}
        initialNumToRender={20}
        windowSize={7}
        onScrollToIndexFailed={({ index }) => list.current?.scrollToOffset({ offset: index * 90, animated: false })}
        renderItem={({ item, index }) => (
          <Verse
            verse={item}
            translationId={translation}
            focused={item.ref.verse === focusVerse}
            marks={shown}
            isSelected={(wordIndex) => isSelected(index, wordIndex)}
            onWordPress={(wordIndex) => press({ verseIndex: index, wordIndex })}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text testID="hint" style={styles.hint}>{hint}</Text>
            {widened ? (
              <Text testID="widened" style={styles.hint}>
                {widened === 1 ? t('widenedOne') : t('widenedMany', { n: widened })}
              </Text>
            ) : null}
          </View>
        }
      />

      {anchor ? (
        <View style={styles.bar} testID="selection-bar">
          <Text style={styles.quote} numberOfLines={2}>{quoted}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {categories.map((c) => (
              <Pressable
                key={c.key}
                testID={`cat-${c.key}`}
                style={[styles.category, { backgroundColor: c.color }]}
                onPress={() => mark(c.key)}>
                <Text style={styles.categoryText}>{t(`cat${c.key}`)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.row}>
            <Pressable testID="copy" style={styles.pill} onPress={copy}><Text style={styles.pillText}>{t('copy')}</Text></Pressable>
            <Pressable testID="share" style={styles.pill} onPress={share}><Text style={styles.pillText}>{t('share')}</Text></Pressable>
            <Pressable style={styles.pill} onPress={clear}><Text style={styles.pillText}>{t('cancel')}</Text></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.nav}>
          <Pressable testID="prev-chapter" disabled={chapter <= 1} style={[styles.pill, chapter <= 1 && styles.off]} onPress={() => turn(-1)}>
            <Text style={styles.pillText}>{t('previous')}</Text>
          </Pressable>
          <Pressable testID="next-chapter" disabled={chapter >= info.chapters} style={[styles.pill, chapter >= info.chapters && styles.off]} onPress={() => turn(1)}>
            <Text style={styles.pillText}>{t('next')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  title: { fontFamily: serifBold, fontSize: 26, color: paper.fg },
  tools: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: paper.line },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  list: { flex: 1 },
  text: { padding: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  footer: { gap: 4, marginTop: 8 },
  hint: { color: paper.muted, fontSize: 14 },
  message: { color: paper.muted, fontSize: 15, padding: 20 },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  pillText: { fontSize: 15, color: paper.fg },
  pillTextOn: { color: paper.accentFg, fontWeight: '600' },
  off: { opacity: 0.4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderTopColor: paper.line },
  bar: { gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: paper.line, backgroundColor: paper.bg },
  quote: { fontSize: 14, color: paper.muted },
  category: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10 },
  categoryText: { fontSize: 14, fontWeight: '600', color: paper.fg },
});

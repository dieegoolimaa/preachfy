import {
  bookById, bookName, canUse, resolveSpan, selectionSpans, visibleMarks,
  type Mark, type ReadingLayer, type VerseSpan, type VerseText, type WordPoint,
} from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, type IconName } from '@/components/ui';
import { Verse } from '@/components/Verse';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { requirePro } from '@/lib/pro';
import { updateReader, useReader } from '@/lib/store';
import { categories, paper, serifBold } from '@/lib/theme';
import { translationById, translations } from '@/lib/translations';

const HOLD_MS = 220;
const DRAG_PX = 10;
const DOUBLE_TAP_MS = 320;

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
  const [selecting, setSelecting] = useState(false);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const area = useRef<ComponentRef<typeof View>>(null);
  const layout = useRef<{ verses: (LayoutRectangle | undefined)[]; words: (LayoutRectangle | undefined)[][] }>({ verses: [], words: [] });

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
    layout.current = { verses: [], words: [] };
  }, [translation, book, chapter]);

  const verses = useMemo<VerseText[]>(
    () => (chapters?.[chapter - 1] ?? []).map((text, i) => ({ ref: { book, chapter, verse: i + 1 }, text })),
    [chapters, book, chapter],
  );

  useEffect(() => {
    if (focusVerse && verses.length >= focusVerse) {
      const id = setTimeout(() => {
        const found = layout.current.verses[focusVerse - 1];
        if (found) list.current?.scrollTo({ y: Math.max(found.y - 80, 0), animated: false });
      }, 120);
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

  /** Finds the word under a point in the text area: the closest one on that line. */
  const wordAt = (x: number, y: number): WordPoint | null => {
    const { verses: rows, words } = layout.current;
    let verseIndex = rows.findIndex((row) => row && y < row.y + row.height);
    if (verseIndex < 0) verseIndex = rows.length - 1;
    const row = rows[verseIndex];
    const list = words[verseIndex];
    if (!row || !list?.length) return null;
    const localY = y - row.y;
    const localX = x - row.x;
    let best = -1;
    let bestScore = Infinity;
    list.forEach((word, wordIndex) => {
      if (!word) return;
      const dy = localY < word.y ? word.y - localY : localY > word.y + word.height ? localY - word.y - word.height : 0;
      const dx = localX < word.x ? word.x - localX : localX > word.x + word.width ? localX - word.x - word.width : 0;
      const score = dy * 1000 + dx;
      if (score < bestScore) {
        bestScore = score;
        best = wordIndex;
      }
    });
    return best < 0 ? null : { verseIndex, wordIndex: best };
  };

  const gesture = useRef({ origin: { x: 0, y: 0 }, start: { x: 0, y: 0 }, active: false, timer: undefined as ReturnType<typeof setTimeout> | undefined, lastTap: 0 });
  const actions = useRef({ wordAt, clear, hasSelection: false });
  actions.current = { wordAt, clear, hasSelection: Boolean(anchor) };

  const responder = useMemo(() => {
    const g = gesture.current;
    const point = (pageX: number, pageY: number) => actions.current.wordAt(pageX - g.origin.x, pageY - g.origin.y);
    const begin = () => {
      const hit = point(g.start.x, g.start.y);
      if (!hit) return;
      g.active = true;
      setSelecting(true);
      setNotice('');
      setAnchor(hit);
      setFocus(hit);
    };
    const stop = () => {
      if (g.timer) clearTimeout(g.timer);
      g.timer = undefined;
      g.active = false;
      setSelecting(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !g.active,
      onPanResponderGrant: ({ nativeEvent: { pageX, pageY } }) => {
        g.start = { x: pageX, y: pageY };
        area.current?.measureInWindow((x, y) => {
          g.origin = { x, y };
        });
        g.timer = setTimeout(begin, HOLD_MS);
      },
      onPanResponderMove: ({ nativeEvent: { pageX, pageY } }) => {
        const dx = Math.abs(pageX - g.start.x);
        const dy = Math.abs(pageY - g.start.y);
        if (!g.active && dx > DRAG_PX && dx > dy * 2) {
          if (g.timer) clearTimeout(g.timer);
          begin();
        } else if (!g.active && dy > DRAG_PX && g.timer) {
          // The finger is scrolling, not selecting.
          clearTimeout(g.timer);
          g.timer = undefined;
        }
        if (g.active) {
          const hit = point(pageX, pageY);
          if (hit) setFocus(hit);
        }
      },
      onPanResponderRelease: ({ nativeEvent: { pageX, pageY } }) => {
        const dragged = g.active;
        const moved = Math.abs(pageX - g.start.x) + Math.abs(pageY - g.start.y) > DRAG_PX;
        stop();
        if (dragged || moved) return;
        const now = Date.now();
        if (now - g.lastTap < DOUBLE_TAP_MS) {
          const hit = point(pageX, pageY);
          g.lastTap = 0;
          if (hit) {
            setNotice('');
            setAnchor(hit);
            setFocus(hit);
          }
          return;
        }
        g.lastTap = now;
        if (actions.current.hasSelection) actions.current.clear();
      },
      onPanResponderTerminate: stop,
    });
  }, []);

  const isSelected = (verseIndex: number, wordIndex: number) => {
    if (!anchor) return false;
    const end = focus ?? anchor;
    const at = order({ verseIndex, wordIndex });
    return at >= Math.min(order(anchor), order(end)) && at <= Math.max(order(anchor), order(end));
  };

  const mark = (categoryKey: string) => {
    if (!canUse('simpleMark', false)) return;
    const created: Mark = { id: newId(), scope: { kind: 'bible' }, spans, categoryKey, note: '', updatedAt: Date.now() };
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

  const createFromSelection = () => {
    if (!requirePro('create')) return;
    const first = spans[0]?.ref.verse;
    const last = spans[spans.length - 1]?.ref.verse;
    router.push({ pathname: '/new', params: { passage: `${title} ${chapter}:${first}-${last}` } });
  };

  const nextVersion = () => {
    const at = translations.findIndex((t) => t.id === translation);
    updateReader({ translation: translations[(at + 1) % translations.length]!.id });
  };

  const turn = (delta: number) => {
    updateReader({ chapter: chapter + delta, verse: undefined });
    list.current?.scrollTo({ y: 0, animated: false });
  };

  const clean = layer.kind === 'clean';
  const hint = notice || t(anchor ? 'tapEnd' : 'tapStart');

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="translation" style={styles.side} onPress={nextVersion}>
          <Text style={styles.version}>{version.short}</Text>
        </Pressable>
        <Pressable testID="open-picker" accessibilityRole="button" style={styles.titleButton} onPress={() => router.push('/picker')}>
          <Text testID="reader-title" style={styles.title} numberOfLines={1}>{title} {chapter}</Text>
          <Ionicons name="chevron-down" size={15} color={paper.muted} />
        </Pressable>
        <View style={[styles.side, styles.sideRight]}>
          <IconButton testID="open-search" icon="search" label={t('search')} onPress={() => router.push('/search')} />
        </View>
      </View>

      {failed ? <Text style={styles.message}>{t('openFailed')}</Text> : null}
      {!chapters && !failed ? <Text style={styles.message}>{t('opening')}</Text> : null}

      <ScrollView ref={list} testID="verses" style={styles.list} contentContainerStyle={styles.text} scrollEnabled={!selecting}>
        <View ref={area} style={styles.area} {...responder.panHandlers}>
          {verses.map((item, index) => (
            <Verse
              key={item.ref.verse}
              verse={item}
              translationId={translation}
              focused={item.ref.verse === focusVerse}
              marks={shown}
              isSelected={(wordIndex) => isSelected(index, wordIndex)}
              onVerseLayout={(rect) => {
                layout.current.verses[index] = rect;
              }}
              onWordLayout={(wordIndex, rect) => {
                (layout.current.words[index] ??= [])[wordIndex] = rect;
              }}
            />
          ))}
        </View>
        <View style={styles.footer}>
          <Text testID="hint" style={styles.hint}>{hint}</Text>
          {widened ? (
            <Text testID="widened" style={styles.hint}>
              {widened === 1 ? t('widenedOne') : t('widenedMany', { n: widened })}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {anchor ? (
        <View style={styles.sheet} testID="selection-bar">
          <Text style={styles.quote} numberOfLines={2}>{quoted}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colors}>
            {categories.map((c) => (
              <Pressable key={c.key} testID={`cat-${c.key}`} accessibilityRole="button" style={styles.color} onPress={() => mark(c.key)}>
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={styles.colorName} numberOfLines={1}>{t(`cat${c.key}`)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <Action testID="copy" icon="copy-outline" label={t('copy')} onPress={copy} />
            <Action testID="share" icon="share-outline" label={t('share')} onPress={share} />
            <Action testID="create-from-selection" icon="create-outline" label={t('create')} onPress={createFromSelection} />
            <Action icon="close" label={t('cancel')} onPress={clear} />
          </View>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <IconButton testID="prev-chapter" icon="chevron-back" label={t('previous')} disabled={chapter <= 1} onPress={() => turn(-1)} />
          <IconButton
            testID="toggle-clean"
            icon={clean ? 'eye-off' : 'eye-outline'}
            label={t('clean')}
            onPress={() => setLayer(clean ? { kind: 'personal' } : { kind: 'clean' })}
          />
          <IconButton testID="open-compare" icon="git-compare-outline" label={t('compare')} onPress={() => requirePro('compareTranslations') && router.push('/compare')} />
          <IconButton testID="open-marks" icon="bookmark-outline" label={t('myMarks')} onPress={() => router.push('/marks')} />
          <IconButton testID="next-chapter" icon="chevron-forward" label={t('next')} disabled={chapter >= info.chapters} onPress={() => turn(1)} />
        </View>
      )}
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={23} color={paper.accent} />
      <Text style={styles.actionText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  side: { flex: 1, minHeight: 44, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  version: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: paper.muted },
  titleButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  title: { fontFamily: serifBold, fontSize: 19, color: paper.fg },
  list: { flex: 1 },
  text: { paddingHorizontal: 22, paddingVertical: 18, maxWidth: 680, width: '100%', alignSelf: 'center' },
  area: { userSelect: 'none' } as object,
  footer: { gap: 4, marginTop: 12 },
  hint: { color: paper.muted, fontSize: 13 },
  message: { color: paper.muted, fontSize: 15, padding: 20 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line, backgroundColor: paper.bg },
  sheet: { gap: 12, paddingTop: 12, paddingBottom: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: paper.card, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -2 } },
  quote: { fontSize: 13, color: paper.muted, paddingHorizontal: 16 },
  colors: { flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  color: { width: 72, minHeight: 58, alignItems: 'center', gap: 5 },
  dot: { width: 32, height: 32, borderRadius: 16 },
  colorName: { fontSize: 11, color: paper.fg },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 },
  action: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionText: { fontSize: 11, color: paper.accent },
});

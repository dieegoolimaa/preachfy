import {
  bookById, bookName, canUse, resolveSpan, selectionSpans, visibleMarks,
  type Mark, type ReadingLayer, type VerseSpan, type VerseText, type WordPoint,
} from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Icon } from '@/components/Icon';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Modal, PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Pill, type IconName } from '@/components/ui';
import { Verse } from '@/components/Verse';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { requirePro } from '@/lib/pro';
import { updateReader, useReader } from '@/lib/store';
import { categories, paper, readingThemes, serifBold } from '@/lib/theme';
import { translationById, translations } from '@/lib/translations';

const HOLD_MS = 220;
const DRAG_PX = 10;
const DOUBLE_TAP_MS = 320;
const EDGE_PX = 70;
const EDGE_STEP = 9;

const order = (p: WordPoint) => p.verseIndex * 10_000 + p.wordIndex;

function verseLabel(spans: VerseSpan[]) {
  const first = spans[0]?.ref.verse;
  const last = spans[spans.length - 1]?.ref.verse;
  return first === last ? `${first}` : `${first}–${last}`;
}

export default function Reader() {
  const { translation, book, chapter, verse: focusVerse, marks, readerTheme, textScale } = useReader();
  const look = readingThemes[readerTheme];
  const [lookOpen, setLookOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const { top } = useSafeAreaInsets();
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

  const gesture = useRef({
    origin: { x: 0, y: 0 }, start: { x: 0, y: 0 }, finger: { x: 0, y: 0 }, top: 0, bottom: 0, offset: 0, max: 0, active: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    edge: undefined as ReturnType<typeof setInterval> | undefined,
    lastTap: 0,
  });
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
      g.edge = setInterval(() => {
        // Near an edge the text moves by itself, so a selection can go past the screen.
        const direction = g.finger.y < g.top + EDGE_PX ? -1 : g.finger.y > g.bottom - EDGE_PX ? 1 : 0;
        const next = Math.min(Math.max(g.offset + direction * EDGE_STEP, 0), g.max);
        if (next === g.offset) return;
        g.origin.y -= next - g.offset;
        g.offset = next;
        list.current?.scrollTo({ y: next, animated: false });
        const moved = point(g.finger.x, g.finger.y);
        if (moved) setFocus(moved);
      }, 30);
    };
    const stop = () => {
      if (g.timer) clearTimeout(g.timer);
      if (g.edge) clearInterval(g.edge);
      g.timer = undefined;
      g.edge = undefined;
      g.active = false;
      setSelecting(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !g.active,
      onPanResponderGrant: ({ nativeEvent: { pageX, pageY } }) => {
        g.start = { x: pageX, y: pageY };
        g.finger = g.start;
        list.current?.measureInWindow?.((_x: number, y: number, _w: number, height: number) => {
          g.top = y;
          g.bottom = y + height;
        });
        area.current?.measureInWindow((x, y) => {
          g.origin = { x, y };
        });
        g.timer = setTimeout(begin, HOLD_MS);
      },
      onPanResponderMove: ({ nativeEvent: { pageX, pageY } }) => {
        g.finger = { x: pageX, y: pageY };
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

  const turn = (delta: number) => {
    updateReader({ chapter: chapter + delta, verse: undefined });
    list.current?.scrollTo({ y: 0, animated: false });
  };

  const clean = layer.kind === 'clean';
  const hint = notice || t(anchor ? 'tapEnd' : 'tapStart');

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: look.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: look.line }]}>
        <Pressable testID="translation" accessibilityRole="button" accessibilityLabel={t('bibleVersion')} style={[styles.side, styles.versionButton]} onPress={() => setVersionOpen(true)}>
          <Text style={[styles.version, { color: look.fg }]}>{version.short}</Text>
          <Icon name="chevron-down" size={12} color={look.muted} />
        </Pressable>
        <Pressable testID="open-picker" accessibilityRole="button" style={styles.titleButton} onPress={() => router.push('/picker')}>
          <Text testID="reader-title" style={[styles.title, { color: look.fg }]} numberOfLines={1}>{title} {chapter}</Text>
          <Icon name="chevron-down" size={13} color={look.muted} />
        </Pressable>
        <View style={[styles.side, styles.sideRight]}>
          <IconButton testID="open-search" icon="search" color={look.fg} label={t('search')} onPress={() => router.push('/search')} />
        </View>
      </View>

      <Modal visible={versionOpen} transparent animationType="fade" onRequestClose={() => setVersionOpen(false)}>
        <Pressable testID="version-backdrop" style={styles.backdrop} onPress={() => setVersionOpen(false)}>
          <View style={[styles.menu, { top: top + 50 }]} testID="version-menu">
            {translations.map((item) => (
              <Pressable
                key={item.id}
                testID={`version-${item.id}`}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.id === translation }}
                style={styles.menuItem}
                onPress={() => {
                  updateReader({ translation: item.id });
                  setVersionOpen(false);
                }}>
                <View style={styles.menuText}>
                  <Text style={styles.menuName}>{item.name}</Text>
                  <Text style={styles.menuLanguage}>{item.short} · {item.language}</Text>
                </View>
                {item.id === translation ? <Icon name="check" size={18} color={paper.fg} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {failed ? <Text style={styles.message}>{t('openFailed')}</Text> : null}
      {!chapters && !failed ? <Text style={styles.message}>{t('opening')}</Text> : null}

      <ScrollView ref={list} testID="verses" style={styles.list} contentContainerStyle={styles.text} scrollEnabled={!selecting}
        scrollEventThrottle={32}
        onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
          gesture.current.offset = contentOffset.y;
          gesture.current.max = Math.max(contentSize.height - layoutMeasurement.height, 0);
        }}
        onContentSizeChange={(_w, height) => {
          gesture.current.max = Math.max(height - (gesture.current.bottom - gesture.current.top), 0);
        }}>
        <View ref={area} style={styles.area} {...responder.panHandlers}>
          {verses.map((item, index) => (
            <Verse
              key={item.ref.verse}
              verse={item}
              translationId={translation}
              focused={item.ref.verse === focusVerse}
              marks={shown}
              isSelected={(wordIndex) => isSelected(index, wordIndex)}
              look={look}
              scale={textScale}
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
          <Text testID="hint" style={[styles.hint, { color: look.muted }]}>{hint}</Text>
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
          <Pill testID="create-from-selection" primary big label={`${t('prepareFromHere')} →`} onPress={createFromSelection} />
          <View style={styles.actions}>
            <Action testID="copy" icon="copy" label={t('copy')} onPress={copy} />
            <Action testID="share" icon="share" label={t('share')} onPress={share} />
            <Action icon="close" label={t('cancel')} onPress={clear} />
          </View>
        </View>
      ) : (
        <>
          {lookOpen ? (
            <View style={styles.sheet} testID="look-panel">
              <View style={styles.lookRow}>
                {(['paper', 'sepia', 'dark'] as const).map((key) => (
                  <Pressable
                    key={key}
                    testID={`theme-${key}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: readerTheme === key }}
                    style={[styles.swatch, { backgroundColor: readingThemes[key].bg }, readerTheme === key && styles.swatchOn]}
                    onPress={() => updateReader({ readerTheme: key })}>
                    <Text style={[styles.swatchText, { color: readingThemes[key].fg }]}>{t(key === 'paper' ? 'themePaper' : key === 'sepia' ? 'themeSepia' : 'themeDark')}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.lookRow}>
                <Pressable testID="text-smaller" accessibilityRole="button" accessibilityLabel={t('textSmaller')} style={styles.size} disabled={textScale <= 0.85} onPress={() => updateReader({ textScale: Math.round((textScale - 0.1) * 10) / 10 })}>
                  <Text style={styles.sizeSmall}>A</Text>
                </Pressable>
                <Pressable testID="text-larger" accessibilityRole="button" accessibilityLabel={t('textLarger')} style={styles.size} disabled={textScale >= 1.5} onPress={() => updateReader({ textScale: Math.round((textScale + 0.1) * 10) / 10 })}>
                  <Text style={styles.sizeLarge}>A</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <View style={[styles.toolbar, { backgroundColor: look.bg, borderTopColor: look.line }]}>
            <IconButton testID="prev-chapter" icon="chevron-back" color={look.fg} label={t('previous')} disabled={chapter <= 1} onPress={() => turn(-1)} />
            <IconButton testID="toggle-clean" icon={clean ? 'eye-off' : 'eye'} color={look.fg} label={t('clean')} onPress={() => setLayer(clean ? { kind: 'personal' } : { kind: 'clean' })} />
            <IconButton testID="open-look" icon="text-size" color={look.fg} label={t('readerLook')} onPress={() => setLookOpen(!lookOpen)} />
            <IconButton testID="open-compare" icon="compare" color={look.fg} label={t('compare')} onPress={() => requirePro('compareTranslations') && router.push('/compare')} />
            <IconButton testID="open-marks" icon="bookmark" color={look.fg} label={t('myMarks')} onPress={() => router.push('/marks')} />
            <IconButton testID="next-chapter" icon="chevron-forward" color={look.fg} label={t('next')} disabled={chapter >= info.chapters} onPress={() => turn(1)} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" style={styles.action} onPress={onPress}>
      <Icon name={icon} size={23} color={paper.accent} />
      <Text style={styles.actionText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  side: { flex: 1, minHeight: 44, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  versionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  version: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu: { position: 'absolute', left: 12, width: 290, borderRadius: 14, backgroundColor: paper.card, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16 },
  menuText: { flex: 1, gap: 1 },
  menuName: { fontSize: 16, color: paper.fg },
  menuLanguage: { fontSize: 12, color: paper.muted },
  titleButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  title: { fontFamily: serifBold, fontSize: 19, color: paper.fg },
  list: { flex: 1 },
  text: { paddingHorizontal: 22, paddingVertical: 18, maxWidth: 680, width: '100%', alignSelf: 'center' },
  area: { userSelect: 'none' } as object,
  footer: { gap: 4, marginTop: 12 },
  hint: { color: paper.muted, fontSize: 13 },
  message: { color: paper.muted, fontSize: 15, padding: 20 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line, backgroundColor: paper.bg },
  sheet: { gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: paper.card, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -2 } },
  lookRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  swatch: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: paper.line },
  swatchOn: { borderWidth: 2, borderColor: paper.fg },
  swatchText: { fontSize: 14, fontWeight: '500' },
  size: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: paper.soft },
  sizeSmall: { fontFamily: serifBold, fontSize: 15, color: paper.fg },
  sizeLarge: { fontFamily: serifBold, fontSize: 23, color: paper.fg },
  quote: { fontSize: 13, color: paper.muted, paddingHorizontal: 16 },
  colors: { flexDirection: 'row', gap: 4, paddingHorizontal: 10 },
  color: { width: 72, minHeight: 58, alignItems: 'center', gap: 5 },
  dot: { width: 32, height: 32, borderRadius: 16 },
  colorName: { fontSize: 11, color: paper.fg },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 },
  action: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionText: { fontSize: 11, color: paper.accent },
});

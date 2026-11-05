import {
  canUse, selectionSpans, visibleMarks,
  type Mark, type ReadingLayer, type VerseSpan, type WordPoint,
} from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Verse } from '@/components/Verse';
import { PASSAGE, TRANSLATION, verses } from '@/lib/sample';
import { categories, paper, serifBold } from '@/lib/theme';

const order = (p: WordPoint) => p.verseIndex * 10_000 + p.wordIndex;

export default function Reader() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [layer, setLayer] = useState<ReadingLayer>({ kind: 'personal' });
  const [anchor, setAnchor] = useState<WordPoint | null>(null);
  const [focus, setFocus] = useState<WordPoint | null>(null);
  const [notice, setNotice] = useState('');

  const shown = useMemo(() => visibleMarks(layer, marks), [layer, marks]);
  const spans: VerseSpan[] = anchor ? selectionSpans(verses, TRANSLATION, anchor, focus ?? anchor) : [];
  const quoted = spans.map((s) => s.quote).join(' ');
  const reference = spans.length ? `${PASSAGE}:${spans.map((s) => s.ref.verse).join(', ')} · KJV` : '';

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
    const low = Math.min(order(anchor), order(end));
    const high = Math.max(order(anchor), order(end));
    const at = order({ verseIndex, wordIndex });
    return at >= low && at <= high;
  };

  const mark = (categoryKey: string) => {
    if (!canUse('simpleMark', false)) return;
    setMarks((all) => [
      ...all,
      { id: `${Date.now()}-${all.length}`, scope: { kind: 'bible' }, spans, categoryKey, note: '' },
    ]);
    setNotice('Destaque salvo');
    clear();
  };

  const copy = async () => {
    await Clipboard.setStringAsync(`“${quoted}” ${reference}`);
    setNotice('Copiado');
  };

  const share = async () => {
    const message = `“${quoted}” ${reference}\nPreachfy`;
    if (Platform.OS === 'web' && !('share' in navigator)) {
      await Clipboard.setStringAsync(message);
      setNotice('Copiado para compartilhar');
      return;
    }
    await Share.share({ message });
  };

  const clean = layer.kind === 'clean';

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{PASSAGE}</Text>
        <View style={styles.row}>
          <Pressable
            testID="toggle-clean"
            style={[styles.pill, clean && styles.pillOn]}
            onPress={() => setLayer(clean ? { kind: 'personal' } : { kind: 'clean' })}>
            <Text style={[styles.pillText, clean && styles.pillTextOn]}>Limpo</Text>
          </Pressable>
          <Pressable testID="open-pulpit" style={[styles.pill, styles.pillOn]} onPress={() => router.push('/pulpit')}>
            <Text style={[styles.pillText, styles.pillTextOn]}>Púlpito</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.text}>
        {verses.map((verse, verseIndex) => (
          <Verse
            key={verse.ref.verse}
            verse={verse}
            marks={shown}
            isSelected={(wordIndex) => isSelected(verseIndex, wordIndex)}
            onWordPress={(wordIndex) => press({ verseIndex, wordIndex })}
          />
        ))}
        <Text style={styles.hint}>
          {notice || (anchor ? 'Toque em outra palavra para fechar o trecho.' : 'Toque em uma palavra para começar.')}
        </Text>
      </ScrollView>

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
                <Text style={styles.categoryText}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.row}>
            <Pressable testID="copy" style={styles.pill} onPress={copy}><Text style={styles.pillText}>Copiar</Text></Pressable>
            <Pressable testID="share" style={styles.pill} onPress={share}><Text style={styles.pillText}>Compartilhar</Text></Pressable>
            <Pressable style={styles.pill} onPress={clear}><Text style={styles.pillText}>Cancelar</Text></Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: paper.line },
  title: { fontFamily: serifBold, fontSize: 26, color: paper.fg },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  text: { padding: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hint: { color: paper.muted, fontSize: 14, marginTop: 8 },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  pillText: { fontSize: 15, color: paper.fg },
  pillTextOn: { color: paper.accentFg, fontWeight: '600' },
  bar: { gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: paper.line, backgroundColor: paper.bg },
  quote: { fontSize: 14, color: paper.muted },
  category: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10 },
  categoryText: { fontSize: 14, fontWeight: '600', color: paper.fg },
});

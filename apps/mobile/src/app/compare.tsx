import { bookName } from '@preachfy/core';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/ui';
import { VersionMenu } from '@/components/VersionMenu';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { useProScreen } from '@/lib/pro';
import { useReader } from '@/lib/store';
import { paper, serif } from '@/lib/theme';
import { translationById, translations } from '@/lib/translations';

/** One soft color per side, so it is clear at a glance which version each text belongs to. */
const sides = [
  { tint: '#E8F0FD', edge: '#7AA7E8', ink: '#1F4E96' },
  { tint: '#E6F5EB', edge: '#6DBA8A', ink: '#1D6B3A' },
] as const;

const words = (text = '') => text.split(/\s+/).filter(Boolean);
const clean = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** The words the other version does not have, so the difference shows without reading both. */
function Diff({ text, other }: { text: string; other: string }) {
  const known = new Set(words(other).map(clean));
  return (
    <Text style={s.text}>
      {words(text).map((word, i) => (
        <Text key={i} style={known.has(clean(word)) ? undefined : s.differs}>{i ? ' ' : ''}{word}</Text>
      ))}
    </Text>
  );
}

export default function Compare() {
  const { locale, t } = useT();
  const allowed = useProScreen('compareTranslations');
  const { book, chapter, translation } = useReader();
  const [ids, setIds] = useState<[string, string]>([translation, translations.find((x) => x.id !== translation)!.id]);
  const [menu, setMenu] = useState<0 | 1 | null>(null);
  const [texts, setTexts] = useState<[string[], string[]]>([[], []]);
  const { width } = useWindowDimensions();
  const wide = width >= 600;

  useEffect(() => {
    let live = true;
    Promise.all([loadBook(ids[0], book), loadBook(ids[1], book)])
      .then(([a, b]) => live && setTexts([a[chapter - 1] ?? [], b[chapter - 1] ?? []]))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ids, book, chapter]);

  if (!allowed) return null;

  const choose = (side: 0 | 1, id: string) => {
    // Comparing a version with itself says nothing, so the other side moves to a different one.
    const other = ids[side === 0 ? 1 : 0];
    const swapped = id === other ? ids[side] : other;
    setIds(side === 0 ? [id, swapped] : [swapped, id]);
  };
  const rows = Array.from({ length: Math.max(texts[0].length, texts[1].length) }, (_, i) => i);

  return (
    <Screen title={`${bookName(book, locale)} ${chapter}`} close testID="compare">
      <Text style={s.explain}>{t('compareHint')}</Text>
      <View style={s.pickers}>
        {([0, 1] as const).map((side) => (
          <Pressable
            key={side}
            testID={side === 0 ? 'compare-left' : 'compare-right'}
            accessibilityRole="button"
            accessibilityLabel={t('bibleVersion')}
            style={[s.picker, { backgroundColor: sides[side].tint, borderColor: sides[side].edge }]}
            onPress={() => setMenu(side)}>
            <Text style={[s.pickerName, { color: sides[side].ink }]}>{translationById(ids[side]).short}</Text>
            <Icon name="chevron-down" size={13} color={sides[side].ink} />
          </Pressable>
        ))}
      </View>
      {rows.map((i) => (
        <View key={i} testID={`compare-${i + 1}`} style={s.row}>
          <Text style={s.number}>{i + 1}</Text>
          <View style={[s.cells, wide && s.side]}>
            {([0, 1] as const).map((side) => (
              <View key={side} style={[s.cell, { backgroundColor: sides[side].tint, borderLeftColor: sides[side].edge }]}>
                <Text style={[s.tag, { color: sides[side].ink }]}>{translationById(ids[side]).short}</Text>
                <Diff text={texts[side][i] ?? ''} other={texts[side === 0 ? 1 : 0][i] ?? ''} />
              </View>
            ))}
          </View>
        </View>
      ))}
      <VersionMenu
        testID="compare-version"
        visible={menu !== null}
        selected={menu === null ? '' : ids[menu]}
        onSelect={(id) => menu !== null && choose(menu, id)}
        onClose={() => setMenu(null)}
        top={150}
        left={16}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  explain: { fontSize: 14, lineHeight: 20, color: paper.muted },
  pickers: { flexDirection: 'row', gap: 10 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1 },
  pickerName: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 10, paddingBottom: 10 },
  number: { width: 22, fontSize: 13, fontWeight: '600', color: paper.muted, paddingTop: 10 },
  cells: { flex: 1, gap: 6 },
  side: { flexDirection: 'row' },
  cell: { flex: 1, gap: 3, padding: 10, borderRadius: 10, borderLeftWidth: 4 },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  text: { fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
  differs: { textDecorationLine: 'underline', textDecorationColor: '#16181D55', fontWeight: '600' },
});

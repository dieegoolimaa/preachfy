import { bookName } from '@preachfy/core';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Pill, Screen, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { useReader } from '@/lib/store';
import { paper, sansSemi, serif } from '@/lib/theme';
import { translationById, translations } from '@/lib/translations';

const cycle = (id: string) => translations[(translations.findIndex((t) => t.id === id) + 1) % translations.length]!.id;

export default function Compare() {
  const { locale } = useT();
  const { book, chapter, translation } = useReader();
  const [left, setLeft] = useState(translation);
  const [right, setRight] = useState(cycle(translation));
  const [texts, setTexts] = useState<[string[], string[]]>([[], []]);
  const { width } = useWindowDimensions();

  useEffect(() => {
    let live = true;
    Promise.all([loadBook(left, book), loadBook(right, book)])
      .then(([a, b]) => live && setTexts([a[chapter - 1] ?? [], b[chapter - 1] ?? []]))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [left, right, book, chapter]);

  const rows = Array.from({ length: Math.max(texts[0].length, texts[1].length) }, (_, i) => i);

  return (
    <Screen title={`${bookName(book, locale)} ${chapter}`} close testID="compare">
      <View style={ui.row}>
        <Pill testID="compare-left" label={translationById(left).short} onPress={() => setLeft(cycle(left))} />
        <Pill testID="compare-right" label={translationById(right).short} onPress={() => setRight(cycle(right))} />
      </View>
      {rows.map((i) => (
        <View key={i} testID={`compare-${i + 1}`} style={[s.row, width >= 600 && s.side]}>
          <Text style={s.number}>{i + 1}</Text>
          <Text style={s.text}>{texts[0][i]}</Text>
          <Text style={s.text}>{texts[1][i]}</Text>
        </View>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: paper.line },
  side: { flexDirection: 'row', gap: 16 },
  number: { width: 24, fontSize: 13, fontFamily: sansSemi, color: paper.muted },
  text: { flex: 1, fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
});

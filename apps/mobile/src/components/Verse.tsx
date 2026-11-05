import { resolveSpan, wordsOf, type Mark, type VerseText } from '@preachfy/core';
import { StyleSheet, Text, View, type LayoutRectangle } from 'react-native';

import { categoryColor, readingThemes, serif } from '@/lib/theme';

type Props = {
  verse: VerseText;
  translationId: string;
  focused?: boolean;
  marks: Mark[];
  isSelected: (wordIndex: number) => boolean;
  look: (typeof readingThemes)['paper'];
  scale: number;
  onVerseLayout: (layout: LayoutRectangle) => void;
  onWordLayout: (wordIndex: number, layout: LayoutRectangle) => void;
};

/** Each word is measured on its own, so a finger can be matched to a word on every platform. */
export function Verse({ verse, translationId, focused, marks, isSelected, look, scale, onVerseLayout, onWordLayout }: Props) {
  const { text, ref } = verse;
  const ranges = marks.flatMap((mark) =>
    mark.spans
      .filter((s) => s.ref.book === ref.book && s.ref.chapter === ref.chapter && s.ref.verse === ref.verse)
      .map((span) => {
        const found = resolveSpan(span, text, translationId);
        const range = found.kind === 'wholeVerse' ? { start: 0, end: text.length } : found;
        return { ...range, color: categoryColor(mark.categoryKey) };
      }),
  );
  const colorAt = (start: number, end: number) => ranges.find((r) => start < r.end && end > r.start)?.color;

  const words = wordsOf(text);
  const paint = (i: number) => {
    if (isSelected(i)) return look.select;
    const color = colorAt(words[i]!.start, words[i]!.end);
    if (!color) return undefined;
    // On a dark page the highlight becomes a translucent layer and the text stays light.
    const alpha = Math.round(look.markOpacity * 255).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  };
  const size = { fontSize: 20 * scale, lineHeight: 30 * scale, color: look.fg };

  return (
    <View style={[styles.verse, focused && styles.focused]} onLayout={(e) => onVerseLayout(e.nativeEvent.layout)}>
      <Text style={[styles.number, { lineHeight: 30 * scale, color: look.muted }]}>{ref.verse}</Text>
      {words.map((word, i) => {
        const next = words[i + 1];
        const after = text.slice(word.end, next ? next.start : text.length).trimEnd();
        const before = i === 0 ? text.slice(0, word.start) : '';
        const color = paint(i);
        // The space takes the color only when the next word has the same one.
        const joined = color && next && paint(i + 1) === color;
        return (
          <Text
            key={i}
            testID={`word-${ref.verse}-${i}`}
            style={[styles.word, size, joined ? { backgroundColor: color } : null]}
            onLayout={(e) => onWordLayout(i, e.nativeEvent.layout)}>
            {before}
            <Text style={color ? { backgroundColor: color } : null}>{word.text}</Text>
            {after}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  verse: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 },
  focused: { backgroundColor: '#8886' },
  number: { fontSize: 11, fontWeight: '600', paddingRight: 5 },
  word: { fontFamily: serif, paddingRight: 5 },
});

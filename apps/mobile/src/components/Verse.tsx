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
  const noted = marks.find((m) => m.note.trim() && m.spans.some((x) => x.ref.book === ref.book && x.ref.chapter === ref.chapter && x.ref.verse === ref.verse));
  const colorAt = (start: number, end: number) => ranges.find((r) => start < r.end && end > r.start)?.color;

  const words = wordsOf(text);
  // One solid color per word, never layered: translucent boxes that overlap would double up into darker bands.
  const paint = (i: number) => {
    if (isSelected(i)) return look.select;
    const color = colorAt(words[i]!.start, words[i]!.end);
    return color ? blend(color, look.bg, look.markOpacity) : undefined;
  };
  const size = { fontSize: 20 * scale, lineHeight: 30 * scale, color: look.fg };

  return (
    <View style={[styles.verse, focused && styles.focused]} onLayout={(e) => onVerseLayout(e.nativeEvent.layout)}>
      <Text style={[styles.number, { lineHeight: 30 * scale, color: look.muted }]}>{ref.verse}</Text>
      {noted ? <View testID={`note-${ref.verse}`} style={[styles.noteDot, { backgroundColor: categoryColor(noted.categoryKey), marginTop: 12 * scale }]} /> : null}
      {words.map((word, i) => {
        const next = words[i + 1];
        const tail = text.slice(word.end, next ? next.start : text.length).trimEnd();
        const lead = i === 0 ? text.slice(0, word.start) : '';
        const color = paint(i);
        // The space between two words takes the color only when both have it, so a run reads as one stroke.
        const joined = Boolean(color) && Boolean(next) && paint(i + 1) === color;
        return (
          <View key={i} style={styles.unit} onLayout={(e) => onWordLayout(i, e.nativeEvent.layout)}>
            <Text testID={`word-${ref.verse}-${i}`} style={[styles.word, size, color ? { backgroundColor: color } : null]}>
              {lead}{word.text}{tail}
            </Text>
            <View style={[styles.gap, { height: 30 * scale }, joined ? { backgroundColor: color } : null]} />
          </View>
        );
      })}
    </View>
  );
}

/** Mixes a color into the page color, so a highlight stays solid on light and dark pages alike. */
function blend(hex: string, base: string, amount: number) {
  const channel = (value: string, at: number) => parseInt(value.slice(1 + at * 2, 3 + at * 2), 16);
  const mix = (at: number) => Math.round(channel(base, at) * (1 - amount) + channel(hex, at) * amount);
  return `#${[0, 1, 2].map((at) => mix(at).toString(16).padStart(2, '0')).join('')}`;
}

const styles = StyleSheet.create({
  verse: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 },
  focused: { backgroundColor: '#8886' },
  number: { fontSize: 11, fontWeight: '600', paddingRight: 5 },
  noteDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  unit: { flexDirection: 'row' },
  word: { fontFamily: serif },
  gap: { width: 5 },
});

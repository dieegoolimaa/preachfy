import { resolveSpan, wordsOf, type Mark, type VerseText } from '@preachfy/core';
import { Text, StyleSheet } from 'react-native';

import { categoryColor, paper, serif } from '@/lib/theme';
import { TRANSLATION } from '@/lib/sample';

type Props = {
  verse: VerseText;
  marks: Mark[];
  isSelected: (wordIndex: number) => boolean;
  onWordPress: (wordIndex: number) => void;
};

/** Each word is its own nested Text, so selection behaves the same on native and web. */
export function Verse({ verse, marks, isSelected, onWordPress }: Props) {
  const { text, ref } = verse;
  const ranges = marks.flatMap((mark) =>
    mark.spans
      .filter((s) => s.ref.verse === ref.verse)
      .map((span) => {
        const found = resolveSpan(span, text, TRANSLATION);
        const range = found.kind === 'wholeVerse' ? { start: 0, end: text.length } : found;
        return { ...range, color: categoryColor(mark.categoryKey) };
      }),
  );
  const colorAt = (start: number, end: number) => ranges.find((r) => start < r.end && end > r.start)?.color;

  const words = wordsOf(text);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  words.forEach((word, i) => {
    if (word.start > cursor) {
      const color = colorAt(cursor, word.start);
      const inside = color && ranges.some((r) => r.start <= cursor && r.end >= word.start);
      parts.push(
        <Text key={`g${i}`} style={inside ? { backgroundColor: color } : undefined}>
          {text.slice(cursor, word.start)}
        </Text>,
      );
    }
    const selected = isSelected(i);
    const color = colorAt(word.start, word.end);
    parts.push(
      <Text
        key={i}
        testID={`word-${ref.verse}-${i}`}
        onPress={() => onWordPress(i)}
        style={[color ? { backgroundColor: color } : null, selected ? styles.selected : null]}>
        {word.text}
      </Text>,
    );
    cursor = word.end;
  });
  if (cursor < text.length) parts.push(<Text key="end">{text.slice(cursor)}</Text>);

  return (
    <Text style={styles.verse}>
      <Text style={styles.number}>{ref.verse} </Text>
      {parts}
    </Text>
  );
}

const styles = StyleSheet.create({
  verse: { fontFamily: serif, fontSize: 21, lineHeight: 33, color: paper.fg, marginBottom: 12 },
  number: { fontSize: 13, fontWeight: '600', color: paper.muted },
  selected: { backgroundColor: paper.fg, color: paper.bg },
});

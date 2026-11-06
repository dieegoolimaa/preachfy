import { bookName, visibleMarks, type Mark } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Chips, Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { getReader, updateReader, useReader } from '@/lib/store';
import { categories, categoryColor, paper, serif } from '@/lib/theme';

const change = (id: string, patch: Partial<Mark>) =>
  updateReader({ marks: getReader().marks.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)) });

export default function Marks() {
  const { t, locale } = useT();
  const { marks } = useReader();
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const shown = visibleMarks({ kind: 'personal' }, marks)
    .filter((m) => !category || m.categoryKey === category)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  const open = ({ spans }: Mark) => {
    const ref = spans[0]?.ref;
    if (!ref) return;
    updateReader({ book: ref.book, chapter: ref.chapter, verse: ref.verse });
    router.navigate('/bible');
  };

  return (
    <Screen title={t('myMarks')} close testID="marks">
      <Chips>
        {categories.map((c) => (
          <Chip key={c.key} testID={`mark-filter-${c.key}`} on={category === c.key} label={t(`cat${c.key}`)} onPress={() => setCategory(category === c.key ? null : c.key)} />
        ))}
      </Chips>
      {shown.length === 0 ? <Hint testID="marks-empty">{t('marksEmpty')}</Hint> : null}
      {shown.map((mark) => {
        const ref = mark.spans[0]?.ref;
        return (
          <Card key={mark.id} testID="mark-row">
            <Pressable style={[s.mark, { borderLeftColor: categoryColor(mark.categoryKey) }]} onPress={() => open(mark)}>
              <Text style={s.quote}>{mark.spans.map((x) => x.quote).filter(Boolean).join(' ')}</Text>
              {ref ? <Hint>{bookName(ref.book, locale)} {ref.chapter}:{ref.verse}</Hint> : null}
            </Pressable>
            {mark.note && editing !== mark.id ? <Text testID="mark-note" style={ui.pillText}>{mark.note}</Text> : null}
            {editing === mark.id ? (
              <Field testID="note-input" multiline value={mark.note} onChangeText={(note) => change(mark.id, { note })} placeholder={t('noteLabel')} />
            ) : null}
            <View style={ui.row}>
              <Pill
                plain
                testID="edit-note"
                label={t(editing === mark.id ? 'done' : 'noteLabel')}
                onPress={() => setEditing(editing === mark.id ? null : mark.id)}
              />
              <Pill plain danger testID="delete-mark" label={t('remove')} onPress={() => change(mark.id, { deletedAt: Date.now() })} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  mark: { gap: 4, paddingLeft: 10, borderLeftWidth: 4 },
  quote: { fontFamily: serif, fontSize: 18, lineHeight: 25, color: paper.fg },
});

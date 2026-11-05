import { BOOKS, type Book } from '@preachfy/core';
import { Icon } from '@/components/Icon';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { updateReader, useReader } from '@/lib/store';
import { paper, serifBold } from '@/lib/theme';

export default function Picker() {
  const reader = useReader();
  const { t, locale } = useT();
  const [book, setBook] = useState<Book | null>(null);

  const open = (chapter: number) => {
    updateReader({ book: book!.id, chapter, verse: undefined });
    goBack();
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable testID="picker-close" style={styles.back} onPress={() => (book ? setBook(null) : goBack())}>
          <Icon name="chevron-back" size={24} color={paper.accent} />
          <Text style={styles.backText}>{t('back')}</Text>
        </Pressable>
        <Text style={styles.title}>{book ? book.names[locale] : t('books')}</Text>
        <View style={styles.back} />
      </View>
      {book ? (
        <View style={styles.grid} testID="chapters">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} testID={`chapter-${n}`} style={styles.cell} onPress={() => open(n)}>
              <Text style={styles.cellText}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={BOOKS}
          keyExtractor={(b) => b.id}
          initialNumToRender={20}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable testID={`book-${item.id}`} style={styles.book} onPress={() => setBook(item)}>
              <Text style={[styles.bookText, item.id === reader.book && styles.current]}>{item.names[locale]}</Text>
              <Text style={styles.count}>{item.chapters}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  back: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  backText: { fontSize: 17, color: paper.accent },
  title: { flex: 2, textAlign: 'center', fontFamily: serifBold, fontSize: 19, color: paper.fg },
  list: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  book: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  bookText: { fontSize: 17, color: paper.fg },
  current: { color: paper.accent, fontWeight: '600' },
  count: { fontSize: 15, color: paper.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  cell: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: paper.soft },
  cellText: { fontSize: 17, color: paper.fg },
});

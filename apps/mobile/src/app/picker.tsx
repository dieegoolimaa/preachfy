import { BOOKS, type Book } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateReader, useReader } from '@/lib/store';
import { paper, serifBold } from '@/lib/theme';

export default function Picker() {
  const reader = useReader();
  const [book, setBook] = useState<Book | null>(null);

  const open = (chapter: number) => {
    updateReader({ book: book!.id, chapter, verse: undefined });
    router.back();
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{book ? book.name : 'Livros'}</Text>
        <Pressable testID="picker-close" style={styles.pill} onPress={() => (book ? setBook(null) : router.back())}>
          <Text style={styles.pillText}>{book ? 'Voltar' : 'Fechar'}</Text>
        </Pressable>
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
              <Text style={[styles.bookText, item.id === reader.book && styles.current]}>{item.name}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: paper.line },
  title: { fontFamily: serifBold, fontSize: 26, color: paper.fg },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillText: { fontSize: 15, color: paper.fg },
  list: { paddingHorizontal: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  book: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: paper.line },
  bookText: { fontSize: 17, color: paper.fg },
  current: { color: paper.accent, fontWeight: '600' },
  count: { fontSize: 14, color: paper.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  cell: { width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: paper.soft },
  cellText: { fontSize: 16, color: paper.fg },
});

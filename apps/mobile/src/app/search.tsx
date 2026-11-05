import { bookById, parseReference, type SearchHit } from '@preachfy/core';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchBible } from '@/lib/bible';
import { updateReader, useReader } from '@/lib/store';
import { paper, serif } from '@/lib/theme';

export default function Search() {
  const { translation } = useReader();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  const open = (book: string, chapter: number, verse?: number) => {
    updateReader({ book, chapter, verse });
    router.back();
  };

  const submit = async () => {
    const text = query.trim();
    if (!text) return;
    const reference = parseReference(text);
    if (reference) return open(reference.book, reference.chapter, reference.verse);
    const id = ++run.current;
    setBusy(true);
    const found = await searchBible(translation, text);
    if (id !== run.current) return;
    setHits(found);
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TextInput
          testID="search-input"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="Palavra ou referência (jo 3 16)"
          placeholderTextColor={paper.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <Pressable testID="search-close" style={styles.pill} onPress={() => router.back()}>
          <Text style={styles.pillText}>Fechar</Text>
        </Pressable>
      </View>
      {busy ? <Text style={styles.message}>Buscando…</Text> : null}
      {hits && !busy ? (
        <Text testID="search-count" style={styles.message}>
          {hits.length === 0 ? 'Nada encontrado.' : `${hits.length >= 100 ? 'Primeiros 100' : hits.length} resultados`}
        </Text>
      ) : null}
      <FlatList
        data={busy ? [] : (hits ?? [])}
        keyExtractor={(h) => `${h.book}-${h.chapter}-${h.verse}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable testID={`hit-${index}`} style={styles.hit} onPress={() => open(item.book, item.chapter, item.verse)}>
            <Text style={styles.ref}>{bookById(item.book)?.name} {item.chapter}:{item.verse}</Text>
            <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: paper.line },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 14, fontSize: 16, color: paper.fg, borderRadius: 10, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillText: { fontSize: 15, color: paper.fg },
  message: { padding: 16, fontSize: 14, color: paper.muted },
  list: { paddingHorizontal: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hit: { paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: paper.line },
  ref: { fontSize: 13, fontWeight: '600', color: paper.accent },
  text: { fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
});

import { bookName, parseReference, type SearchHit } from '@preachfy/core';
import { Icon } from '@/components/Icon';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchBible } from '@/lib/bible';
import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { updateReader, useReader } from '@/lib/store';
import { paper, serif } from '@/lib/theme';

export default function Search() {
  const { translation } = useReader();
  const { t, locale } = useT();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  const open = (book: string, chapter: number, verse?: number) => {
    updateReader({ book, chapter, verse });
    goBack();
  };

  const submit = async () => {
    const text = query.trim();
    if (!text) return;
    const reference = parseReference(text, locale);
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
        <View style={styles.field}>
        <Icon name="search" size={17} color={paper.muted} />
        <TextInput
          testID="search-input"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder={t('searchHint')}
          placeholderTextColor={paper.muted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        </View>
        <Pressable testID="search-close" hitSlop={8} onPress={() => goBack()}>
          <Text style={styles.cancel}>{t('cancel')}</Text>
        </Pressable>
      </View>
      {busy ? <Text style={styles.message}>{t('searching')}</Text> : null}
      {hits && !busy ? (
        <Text testID="search-count" style={styles.message}>
          {hits.length === 0 ? t('nothing') : hits.length >= 100 ? t('first100') : t('results', { n: hits.length })}
        </Text>
      ) : null}
      <FlatList
        data={busy ? [] : (hits ?? [])}
        keyExtractor={(h) => `${h.book}-${h.chapter}-${h.verse}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Pressable testID={`hit-${index}`} style={styles.hit} onPress={() => open(item.book, item.chapter, item.verse)}>
            <Text style={styles.ref}>{bookName(item.book, locale)} {item.chapter}:{item.verse}</Text>
            <Text style={styles.text} numberOfLines={3}>{item.text}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  field: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 8, borderRadius: 10, backgroundColor: paper.soft },
  input: { flex: 1, minWidth: 0, minHeight: 36, fontSize: 17, color: paper.fg },
  cancel: { fontSize: 17, color: paper.accent },
  message: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: paper.muted },
  list: { paddingHorizontal: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hit: { paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  ref: { fontSize: 13, fontWeight: '600', color: paper.muted },
  text: { fontFamily: serif, fontSize: 18, lineHeight: 25, color: paper.fg },
});

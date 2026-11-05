import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { paper, serifBold } from '@/lib/theme';
import { translations } from '@/lib/translations';

export default function About() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Sobre e licenças</Text>
        <Pressable testID="about-close" style={styles.pill} onPress={() => router.back()}>
          <Text style={styles.pillText}>Fechar</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {translations.map((t) => (
          <View key={t.id} testID={`license-${t.id}`} style={styles.item}>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.language}>{t.language}</Text>
            <Text style={styles.credit}>{t.credit}</Text>
            {t.url ? <Text style={styles.link} onPress={() => Linking.openURL(t.url!)}>{t.url}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: paper.line },
  title: { fontFamily: serifBold, fontSize: 24, color: paper.fg, flexShrink: 1 },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillText: { fontSize: 15, color: paper.fg },
  body: { padding: 16, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  item: { gap: 4 },
  name: { fontSize: 17, fontWeight: '600', color: paper.fg },
  language: { fontSize: 13, color: paper.muted },
  credit: { fontSize: 15, lineHeight: 22, color: paper.fg },
  link: { fontSize: 14, color: paper.accent },
});

import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { localeNames, locales, useT } from '@/lib/i18n';
import { defaultTranslation, updateReader, useReader } from '@/lib/store';
import { paper, serifBold } from '@/lib/theme';
import { translations } from '@/lib/translations';

export default function About() {
  const { t, locale } = useT();
  const { translation } = useReader();

  const choose = (next: typeof locale) => {
    // The Bible only follows the language while it is still that language's default.
    const keep = translation !== defaultTranslation[locale];
    updateReader({ locale: next, translation: keep ? translation : defaultTranslation[next] });
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('aboutTitle')}</Text>
        <Pressable testID="about-close" style={styles.pill} onPress={() => router.back()}>
          <Text style={styles.pillText}>{t('close')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.item}>
          <Text style={styles.name}>{t('language')}</Text>
          <View style={styles.row}>
            {locales.map((code) => (
              <Pressable
                key={code}
                testID={`locale-${code}`}
                style={[styles.pill, code === locale && styles.pillOn]}
                onPress={() => choose(code)}>
                <Text style={[styles.pillText, code === locale && styles.pillTextOn]}>{localeNames[code]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
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
  pillOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  pillText: { fontSize: 15, color: paper.fg },
  pillTextOn: { color: paper.accentFg, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 6 },
  body: { padding: 16, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  item: { gap: 4 },
  name: { fontSize: 17, fontWeight: '600', color: paper.fg },
  language: { fontSize: 13, color: paper.muted },
  credit: { fontSize: 15, lineHeight: 22, color: paper.fg },
  link: { fontSize: 14, color: paper.accent },
});

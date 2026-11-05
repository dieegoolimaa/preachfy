import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { legal } from '@/lib/legal';
import { paper } from '@/lib/theme';

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { t, locale } = useT();
  const key = doc === 'terms' ? 'terms' : 'privacy';
  return (
    <Screen title={t(key)} close testID={`legal-${key}`}>
      {legal[key][locale].map(([title, body]) => (
        <View key={title} style={s.block}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.body}>{body}</Text>
        </View>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  block: { gap: 4 },
  title: { fontSize: 17, fontWeight: '600', color: paper.fg },
  body: { fontSize: 17, lineHeight: 24, color: paper.fg },
});

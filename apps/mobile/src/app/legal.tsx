import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Heading, Screen } from '@/components/ui';
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
        <Text key={title}>
          <Heading>{title}</Heading>
          {'\n'}
          <Text style={s.body}>{body}</Text>
        </Text>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({ body: { fontSize: 16, lineHeight: 24, color: paper.fg } });

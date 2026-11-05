import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking } from 'react-native';

import { Group, Row, Screen } from '@/components/ui';
import { localeNames, locales, useT } from '@/lib/i18n';
import { defaultTranslation, updateReader, useReader } from '@/lib/store';
import { paper } from '@/lib/theme';
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
    <Screen title={t('aboutTitle')} close testID="about">
      <Group title={t('language')}>
        {locales.map((code) => (
          <Row
            key={code}
            testID={`locale-${code}`}
            label={localeNames[code]}
            right={code === locale ? <Ionicons name="checkmark" size={20} color={paper.accent} /> : undefined}
            tint={false}
            onPress={() => choose(code)}
          />
        ))}
      </Group>
      {translations.map((item) => (
        <Group key={item.id} testID={`license-${item.id}`} title={item.name}>
          <Row label={item.language} detail={item.credit} />
          {item.url ? <Row tint label={item.url} onPress={() => Linking.openURL(item.url!)} /> : null}
        </Group>
      ))}
    </Screen>
  );
}

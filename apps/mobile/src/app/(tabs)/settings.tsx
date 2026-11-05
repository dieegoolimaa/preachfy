import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, Text } from 'react-native';

import { Card, Heading, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { usePro } from '@/lib/pro';
import { getReader } from '@/lib/store';

export default function Settings() {
  const { t } = useT();
  const { data: session } = authClient.useSession();
  const pro = usePro();
  const [exported, setExported] = useState(false);

  /** Exporting is never gated: what people made is theirs. */
  const exportAll = async () => {
    const { marks, studies, runs } = getReader();
    const message = JSON.stringify({ format: 'preachfy-export', version: 1, marks, studies, runs });
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message);
      setExported(true);
    } else {
      await Share.share({ message });
    }
  };

  return (
    <Screen title={t('settings')} testID="settings">
      <Card testID="plan-card">
        <Text style={ui.cardTitle}>{t(pro ? 'planPro' : 'planFree')}</Text>
        {pro ? <Hint>{t('manageHint')}</Hint> : <Pill testID="see-plans" primary label={t('seePlans')} onPress={() => router.push('/paywall')} />}
      </Card>
      <Pill testID="open-account" label={session?.user ? session.user.email : t('account')} onPress={() => router.push('/account')} />
      <Pill testID="open-marks" label={t('myMarks')} onPress={() => router.push('/marks')} />
      <Pill testID="open-about" label={t('aboutTitle')} onPress={() => router.push('/about')} />
      <Heading>{t('yourData')}</Heading>
      <Pill testID="export" label={t('exportAll')} onPress={exportAll} />
      {exported ? <Hint testID="exported">{t('copied')}</Hint> : null}
      <Pill testID="open-privacy" label={t('privacy')} onPress={() => router.push('/legal?doc=privacy')} />
      <Pill testID="open-terms" label={t('terms')} onPress={() => router.push('/legal?doc=terms')} />
    </Screen>
  );
}

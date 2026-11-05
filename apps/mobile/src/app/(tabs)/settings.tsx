import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share } from 'react-native';

import { Group, Row, Screen } from '@/components/ui';
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
      <Group testID="plan-card" footer={pro ? t('manageHint') : undefined}>
        <Row icon="star" label={t(pro ? 'planPro' : 'planFree')} />
        {pro ? null : <Row testID="see-plans" tint label={t('seePlans')} onPress={() => router.push('/paywall')} />}
      </Group>
      <Group>
        <Row testID="open-account" icon="person" label={t('account')} value={session?.user?.email} onPress={() => router.push('/account')} />
        <Row testID="open-marks" icon="color-wand" label={t('myMarks')} onPress={() => router.push('/marks')} />
        <Row testID="open-about" icon="information" label={t('aboutTitle')} onPress={() => router.push('/about')} />
      </Group>
      <Group title={t('yourData')} footer={exported ? t('copied') : undefined}>
        <Row testID="export" icon="share" label={t('exportAll')} onPress={exportAll} />
        <Row testID="open-privacy" icon="hand-left" label={t('privacy')} onPress={() => router.push('/legal?doc=privacy')} />
        <Row testID="open-terms" icon="document-text" label={t('terms')} onPress={() => router.push('/legal?doc=terms')} />
      </Group>
    </Screen>
  );
}

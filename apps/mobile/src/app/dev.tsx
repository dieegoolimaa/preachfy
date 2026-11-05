import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Hint, Screen } from '@/components/ui';
import { devLogin, seedStudy } from '@/lib/devtools';
import { useT } from '@/lib/i18n';

/** Development shortcut: opens as exp://…/--/dev. Signs in, unlocks Pro and opens a ready study. */
export default function Dev() {
  const { locale } = useT();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    devLogin().then((ok) => {
      if (!ok) setFailed(true);
      else router.replace(`/study/${seedStudy(locale)}`);
    });
  }, [locale]);

  return (
    <Screen title="Dev" testID="dev">
      <Hint testID="dev-status">{failed ? 'Não foi possível entrar. A API está rodando com npm run dev?' : 'Entrando…'}</Hint>
    </Screen>
  );
}

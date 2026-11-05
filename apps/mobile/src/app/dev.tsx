import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Hint, Screen } from '@/components/ui';
import { devLogin, seedStudy } from '@/lib/devtools';
import { useT } from '@/lib/i18n';

/** Development shortcut: opens as exp://…/--/dev. Signs in, unlocks Pro and opens a ready study. */
export default function Dev() {
  const { locale } = useT();
  const { to } = useLocalSearchParams<{ to?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/');
      return;
    }
    devLogin().then((ok) => {
      if (!ok) setFailed(true);
      else {
        const id = seedStudy(locale);
        router.replace(to === 'pulpit' ? `/pulpit?id=${id}&autostart=1&block=1` : `/study/${id}`);
      }
    });
  }, [locale, to]);

  return (
    <Screen title="Dev" testID="dev">
      <Hint testID="dev-status">{failed ? 'Não foi possível entrar. A API está rodando com npm run dev?' : 'Entrando…'}</Hint>
    </Screen>
  );
}

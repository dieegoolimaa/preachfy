import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Hint, Pill, Screen } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { call } from '@/lib/community';
import { useT } from '@/lib/i18n';

/** Opens from an invite link. Asks for an account, then joins. */
export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useT();
  const { data: session, isPending } = authClient.useSession();
  const [failed, setFailed] = useState(false);
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (!signedIn) return;
    call<{ id: string }>('/communities/join', 'POST', { code }).then((joined) => {
      if (joined) router.replace(`/community/${joined.id}`);
      else setFailed(true);
    });
  }, [signedIn, code]);

  return (
    <Screen title={t('joinCommunity')} testID="join-page">
      {failed ? <Hint testID="join-failed">{t('inviteInvalid')}</Hint> : null}
      {!isPending && !signedIn ? (
        <>
          <Hint>{t('joinNeedsAccount')}</Hint>
          <Pill testID="join-signin" primary label={t('signIn')} onPress={() => router.push('/account')} />
        </>
      ) : null}
    </Screen>
  );
}

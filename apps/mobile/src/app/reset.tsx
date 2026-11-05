import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';

/** Opens from the recovery email. */
export default function Reset() {
  const { t } = useT();
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(Boolean(error) || !token);

  const save = async () => {
    setFailed(false);
    const result = await authClient.resetPassword({ newPassword: password, token: token! }).catch(() => ({ error: true }));
    if (result.error) setFailed(true);
    else setDone(true);
  };

  return (
    <Screen title={t('newPassword')} testID="reset">
      {done ? (
        <>
          <Hint testID="reset-done">{t('passwordChanged')}</Hint>
          <Pill testID="reset-signin" primary big label={t('signIn')} onPress={() => router.replace('/account')} />
        </>
      ) : (
        <>
          <Field testID="reset-password" value={password} onChangeText={setPassword} placeholder={t('newPassword')} secureTextEntry autoCapitalize="none" />
          <Pill testID="reset-save" primary big disabled={password.length < 8 || !token} label={t('savePassword')} onPress={save} />
          {failed ? <Text testID="reset-error" style={ui.error}>{t('resetInvalid')}</Text> : null}
        </>
      )}
    </Screen>
  );
}

import { useState } from 'react';
import { Text } from 'react-native';

import { Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { WEB_URL } from '@/lib/live';

export default function Forgot() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async () => {
    setFailed(false);
    try {
      const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${WEB_URL}/reset` });
      if (error) setFailed(true);
      else setSent(true);
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen title={t('forgotPassword')} close testID="forgot">
      {sent ? (
        <Hint testID="forgot-sent">{t('resetSent')}</Hint>
      ) : (
        <>
          <Hint>{t('forgotHint')}</Hint>
          <Field testID="forgot-email" value={email} onChangeText={setEmail} placeholder={t('email')} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          <Pill testID="forgot-send" primary big disabled={!email.trim()} label={t('sendLink')} onPress={send} />
          {failed ? <Text style={ui.error}>{t('offline')}</Text> : null}
        </>
      )}
    </Screen>
  );
}

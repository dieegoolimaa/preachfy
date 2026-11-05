import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Field, Group, Hint, Pill, Row, Screen, ui } from '@/components/ui';
import { apiFetch, authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { WEB_URL } from '@/lib/live';
import { updateReader } from '@/lib/store';

export default function Account() {
  const { t } = useT();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pro, setPro] = useState<boolean | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resent, setResent] = useState(false);

  const user = session?.user;

  useEffect(() => {
    if (!user) return;
    apiFetch('/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((me) => me && setPro(Boolean(me.pro)))
      .catch(() => {});
  }, [user]);

  const run = async (action: () => Promise<{ error: unknown }>, failure: string) => {
    setBusy(true);
    setError('');
    try {
      const result = await action();
      if (result.error) setError(failure);
      else {
        setPassword('');
        setDeleting(false);
        refetch();
      }
    } catch {
      setError(t('offline'));
    }
    setBusy(false);
  };

  /** The plan belongs to the account, so it goes when the account leaves this device. */
  const leave = (action: () => Promise<{ error: unknown }>) => async () => {
    const result = await action();
    if (!result.error) updateReader({ pro: false, proUntil: null });
    return result;
  };

  const resend = async () => {
    if (!user) return;
    await authClient.sendVerificationEmail({ email: user.email, callbackURL: `${WEB_URL}/account` }).catch(() => {});
    setResent(true);
  };

  const submit = () =>
    creating
      ? run(() => authClient.signUp.email({ name: name.trim() || email, email: email.trim(), password, callbackURL: `${WEB_URL}/account` }), t('signUpFailed'))
      : run(() => authClient.signIn.email({ email: email.trim(), password }), t('signInFailed'));

  const input = (testID: string, value: string, onChange: (v: string) => void, label: string, secret = false) => (
    <Field testID={testID} value={value} onChangeText={onChange} placeholder={label} secureTextEntry={secret} autoCapitalize="none" autoCorrect={false} />
  );

  return (
    <Screen title={t('account')} close testID="account">
      {isPending ? null : user ? (
        <>
          {user.emailVerified ? null : (
            <Group testID="verify-banner" footer={resent ? t('verifySent') : t('verifyHint')}>
              <Row testID="verify-resend" tint label={t('verifyResend')} onPress={resend} />
            </Group>
          )}
          <Group footer={t('syncNote')}>
            <Row label={user.email} labelTestID="account-email" />
            <Row label={pro === null ? ' ' : t(pro ? 'planPro' : 'planFree')} labelTestID="account-plan" />
          </Group>
          <Group>
            <Row testID="sign-out" tint label={t('signOut')} onPress={() => run(leave(() => authClient.signOut()), t('offline'))} />
            {deleting ? null : <Row testID="delete-account" danger label={t('deleteAccount')} onPress={() => setDeleting(true)} />}
          </Group>
          {deleting ? (
            <>
              <Hint testID="delete-warning">{t('deleteWarning')}</Hint>
              {input('delete-password', password, setPassword, t('password'), true)}
              <Pill testID="confirm-delete" big primary label={t('confirmDelete')} onPress={() => run(leave(() => authClient.deleteUser({ password })), t('deleteFailed'))} />
              <Pill plain label={t('cancel')} onPress={() => setDeleting(false)} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Hint>{t('accountHint')}</Hint>
          {creating ? input('name', name, setName, t('name')) : null}
          {input('email', email, setEmail, t('email'))}
          {input('password', password, setPassword, t('password'), true)}
          {creating ? <Hint testID="consent">{t('consent')}</Hint> : null}
          <Pill testID="submit" big primary disabled={busy} label={t(creating ? 'signUp' : 'signIn')} onPress={submit} />
          {creating ? null : <Pill testID="forgot" plain label={t('forgotPassword')} onPress={() => router.push('/forgot')} />}
          <Pill testID="toggle-mode" plain label={t(creating ? 'haveAccount' : 'noAccount')} onPress={() => setCreating(!creating)} />
        </>
      )}
      {error ? <Text testID="account-error" style={ui.error}>{error}</Text> : null}
    </Screen>
  );
}

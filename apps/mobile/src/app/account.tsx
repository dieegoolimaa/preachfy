import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch, authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { updateReader } from '@/lib/store';
import { paper, sans, sansBold, sansSemi } from '@/lib/theme';

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

  const submit = () =>
    creating
      ? run(() => authClient.signUp.email({ name: name.trim() || email, email: email.trim(), password }), t('signUpFailed'))
      : run(() => authClient.signIn.email({ email: email.trim(), password }), t('signInFailed'));

  const input = (testID: string, value: string, onChange: (v: string) => void, label: string, secret = false) => (
    <TextInput
      testID={testID}
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={paper.muted}
      secureTextEntry={secret}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('account')}</Text>
        <Pressable testID="account-close" style={styles.pill} onPress={() => goBack()}>
          <Text style={styles.pillText}>{t('close')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {isPending ? null : user ? (
          <>
            <Text testID="account-email" style={styles.name}>{user.email}</Text>
            <Text testID="account-plan" style={styles.hint}>
              {pro === null ? ' ' : t(pro ? 'planPro' : 'planFree')}
            </Text>
            <Text style={styles.hint}>{t('syncNote')}</Text>
            <Pressable testID="sign-out" style={styles.pill} onPress={() => run(leave(() => authClient.signOut()), t('offline'))}>
              <Text style={styles.pillText}>{t('signOut')}</Text>
            </Pressable>
            {deleting ? (
              <View style={styles.danger}>
                <Text testID="delete-warning" style={styles.warning}>{t('deleteWarning')}</Text>
                {input('delete-password', password, setPassword, t('password'), true)}
                <Pressable
                  testID="confirm-delete"
                  disabled={busy}
                  style={[styles.pill, styles.pillDanger]}
                  onPress={() => run(leave(() => authClient.deleteUser({ password })), t('deleteFailed'))}>
                  <Text style={styles.pillDangerText}>{t('confirmDelete')}</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={() => setDeleting(false)}>
                  <Text style={styles.pillText}>{t('cancel')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable testID="delete-account" style={styles.pill} onPress={() => setDeleting(true)}>
                <Text style={styles.pillText}>{t('deleteAccount')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>{t('accountHint')}</Text>
            {creating ? input('name', name, setName, t('name')) : null}
            {creating ? <Text testID="consent" style={styles.hint}>{t('consent')}</Text> : null}
            {input('email', email, setEmail, t('email'))}
            {input('password', password, setPassword, t('password'), true)}
            <Pressable testID="submit" disabled={busy} style={[styles.pill, styles.pillOn]} onPress={submit}>
              <Text style={styles.pillTextOn}>{t(creating ? 'signUp' : 'signIn')}</Text>
            </Pressable>
            <Pressable testID="toggle-mode" style={styles.pill} onPress={() => setCreating(!creating)}>
              <Text style={styles.pillText}>{t(creating ? 'haveAccount' : 'noAccount')}</Text>
            </Pressable>
          </>
        )}
        {error ? <Text testID="account-error" style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: paper.line },
  title: { fontFamily: sansBold, fontSize: 26, color: paper.fg },
  body: { padding: 16, gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  name: { fontSize: 18, fontFamily: sansSemi, color: paper.fg },
  hint: { fontFamily: sans, fontSize: 15, lineHeight: 22, color: paper.muted },
  input: { minHeight: 48, paddingHorizontal: 14, fontFamily: sans, fontSize: 16, color: paper.fg, borderRadius: 10, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pill: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  pillText: { fontFamily: sans, fontSize: 15, color: paper.fg },
  pillTextOn: { fontSize: 15, fontFamily: sansSemi, color: paper.accentFg },
  pillDanger: { backgroundColor: paper.over, borderColor: paper.over },
  pillDangerText: { fontSize: 15, fontFamily: sansSemi, color: paper.accentFg },
  danger: { gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: paper.line },
  warning: { fontFamily: sans, fontSize: 15, lineHeight: 22, color: paper.fg },
  error: { fontFamily: sans, fontSize: 15, color: paper.over },
});

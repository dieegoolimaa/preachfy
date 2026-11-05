import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Card, Field, Heading, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { call, type Community } from '@/lib/community';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';

export default function Communities() {
  const { t } = useT();
  const { data: session, isPending } = authClient.useSession();
  const [list, setList] = useState<Community[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState('');
  const signedIn = Boolean(session?.user);

  const load = useCallback(() => {
    if (signedIn) call<Community[]>('/communities').then((found) => found && setList(found));
  }, [signedIn]);
  useFocusEffect(load);

  const create = async () => {
    if (!requirePro('createCommunity') || !name.trim()) return;
    const created = await call<{ id: string }>('/communities', 'POST', { name });
    if (created) router.push(`/community/${created.id}`);
    else setFailure(t('offline'));
  };

  const join = async () => {
    const joined = await call<{ id: string }>('/communities/join', 'POST', { code });
    if (joined) router.push(`/community/${joined.id}`);
    else setFailure(t('inviteInvalid'));
  };

  if (isPending) return <Screen title={t('community')}>{null}</Screen>;

  if (!signedIn) {
    return (
      <Screen title={t('community')} testID="community">
        <Hint>{t('communityIntro')}</Hint>
        <Pill testID="community-signin" primary label={t('signIn')} onPress={() => router.push('/account')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('community')} testID="community">
      {list?.map((item) => (
        <Card key={item.id} testID="community-row" onPress={() => router.push(`/community/${item.id}`)}>
          <Text style={ui.cardTitle}>{item.name}</Text>
          <Hint>{t('membersCount', { n: item.memberCount })} · {t(item.role === 'leader' ? 'leader' : 'member')}</Hint>
        </Card>
      ))}
      {list?.length === 0 ? <Hint testID="community-empty">{t('communityIntro')}</Hint> : null}

      <Heading>{t('joinCommunity')}</Heading>
      <Field testID="join-code" value={code} onChangeText={setCode} placeholder={t('inviteCode')} autoCapitalize="characters" autoCorrect={false} />
      <Pill testID="join" disabled={!code.trim()} label={t('join')} onPress={join} />

      <Heading>{t('createCommunity')}</Heading>
      <Hint>{t('createCommunityHint')}</Hint>
      <Field testID="community-name" value={name} onChangeText={setName} placeholder={t('communityName')} />
      <Pill testID="create-community" primary disabled={!name.trim()} label={t('createCommunity')} onPress={create} />
      {failure ? <Text testID="community-error" style={ui.error}>{failure}</Text> : null}
    </Screen>
  );
}

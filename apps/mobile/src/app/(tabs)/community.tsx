import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { call, type Community } from '@/lib/community';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';
import { paper, serifBold } from '@/lib/theme';

export default function Communities() {
  const { t } = useT();
  const { data: session, isPending } = authClient.useSession();
  const [list, setList] = useState<Community[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState('');
  const [panel, setPanel] = useState<'join' | 'create' | null>(null);
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
        <Pill testID="community-signin" primary big label={t('signIn')} onPress={() => router.push('/account')} />
      </Screen>
    );
  }

  // With no community yet, the form to create one is already open.
  const shown = panel ?? (list?.length === 0 ? 'create' : null);
  return (
    <Screen title={t('community')} testID="community">
      {list?.length ? <Text style={c.section}>{t('yourGroups').toUpperCase()}</Text> : null}
      {list?.map((item) => (
        <Pressable key={item.id} testID="community-row" accessibilityRole="button" style={({ pressed }) => [c.group, pressed && c.pressed]} onPress={() => router.push(`/community/${item.id}`)}>
          <View style={[c.tile, { backgroundColor: tints[[...item.name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % tints.length] }]}>
            <Text style={c.tileText}>{item.name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={c.groupBody}>
            <Text style={c.groupName} numberOfLines={1}>{item.name}</Text>
            {item.description ? <Text style={c.groupAbout} numberOfLines={2}>{item.description}</Text> : null}
            <Text style={c.groupMeta}>{item.memberCount === 1 ? t('peopleOne') : t('peopleMany', { n: item.memberCount })} · {t(item.role === 'leader' ? 'leader' : 'member')}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={paper.muted} />
        </Pressable>
      ))}
      {list?.length === 0 ? <Hint testID="community-empty">{t('communityIntro')}</Hint> : null}

      <Pressable testID="show-join" accessibilityRole="button" style={c.action} onPress={() => setPanel(shown === 'join' ? null : 'join')}>
        <Text style={c.actionText}>{t('joinGroup')}</Text>
        <Icon name={shown === 'join' ? 'chevron-up' : 'chevron-down'} size={16} color={paper.muted} />
      </Pressable>
      {shown === 'join' ? (
        <View style={c.panel}>
          <Field testID="join-code" value={code} onChangeText={setCode} placeholder={t('inviteCode')} autoCapitalize="characters" autoCorrect={false} />
          <Pill testID="join" primary big disabled={!code.trim()} label={t('join')} onPress={join} />
        </View>
      ) : null}

      <Pressable testID="show-create" accessibilityRole="button" style={c.action} onPress={() => setPanel(shown === 'create' ? null : 'create')}>
        <View style={c.groupBody}>
          <Text style={c.actionText}>{t('startGroup')}</Text>
          <Text style={c.groupMeta}>{t('createCommunityHint')}</Text>
        </View>
        <Icon name={shown === 'create' ? 'chevron-up' : 'chevron-down'} size={16} color={paper.muted} />
      </Pressable>
      {shown === 'create' ? (
        <View style={c.panel}>
          <Field testID="community-name" value={name} onChangeText={setName} placeholder={t('communityName')} />
          <Pill testID="create-community" primary big disabled={!name.trim()} label={t('createCommunity')} onPress={create} />
        </View>
      ) : null}
      {failure ? <Text testID="community-error" style={ui.error}>{failure}</Text> : null}
    </Screen>
  );
}

const tints = ['#FFE98A', '#CFE3FF', '#D5F0DD', '#F6D6E0', '#E4DAF7'];

const c = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: paper.muted },
  group: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: paper.card, borderWidth: StyleSheet.hairlineWidth, borderColor: paper.line },
  pressed: { backgroundColor: paper.soft },
  tile: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: serifBold, fontSize: 28, color: paper.fg },
  groupBody: { flex: 1, gap: 2 },
  groupName: { fontFamily: serifBold, fontSize: 22, lineHeight: 26, color: paper.fg },
  groupAbout: { fontSize: 15, lineHeight: 20, color: paper.muted },
  groupMeta: { fontSize: 13, color: paper.muted },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  actionText: { fontSize: 17, fontWeight: '500', color: paper.fg },
  panel: { gap: 12, paddingBottom: 8 },
});

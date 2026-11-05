import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Group, Hint, Pill, Row, Screen, Title, ui } from '@/components/ui';
import { apiFetch, authClient } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { buy, isCancelled, loadPackages, restore } from '@/lib/purchases';
import { updateReader } from '@/lib/store';
import { paper } from '@/lib/theme';

export default function Paywall() {
  const { t } = useT();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [chosen, setChosen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'storeUnavailable' | 'purchasePending' | 'purchaseFailed' | null>(null);

  useEffect(() => {
    if (!userId) return;
    loadPackages(userId)
      // The yearly plan comes first: it is the best value.
      .then((found) => setPackages([...found].sort((a, b) => Number(b.packageType === 'ANNUAL') - Number(a.packageType === 'ANNUAL'))))
      .catch(() => setFailure('storeUnavailable'));
  }, [userId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
      const response = await apiFetch('/me');
      const me = response.ok ? await response.json() : null;
      if (me?.pro) {
        updateReader({ pro: true, proUntil: me.expiresAt });
        goBack();
      } else {
        setFailure('purchasePending');
      }
    } catch (error) {
      if (!isCancelled(error)) setFailure('purchaseFailed');
    }
    setBusy(false);
  };

  const item = packages[chosen];

  return (
    <Screen title="" close testID="paywall">
      <Title>Preachfy Pro</Title>
      {feature ? <Hint testID="paywall-reason">{t('proNeeded')}</Hint> : null}
      <Group>
        {(['proCreate', 'proPulpit', 'proClass', 'proCommunity', 'proSync'] as const).map((key) => (
          <Row key={key} label={t(key)} />
        ))}
      </Group>
      {isPending ? null : !userId ? (
        <>
          <Hint>{t('signInToSubscribe')}</Hint>
          <Pill testID="paywall-signin" primary big label={t('signIn')} onPress={() => router.push('/account')} />
        </>
      ) : (
        <>
          <View style={s.plans}>
            {packages.map((option, index) => (
              <Pressable
                key={option.identifier}
                testID={`plan-${option.packageType.toLowerCase()}`}
                style={[s.plan, index === chosen && s.planOn]}
                onPress={() => setChosen(index)}>
                <Text style={s.tag}>{option.packageType === 'ANNUAL' ? t('bestValue') : ' '}</Text>
                <Text style={s.planName}>{t(option.packageType === 'ANNUAL' ? 'yearly' : 'monthly')}</Text>
                <Text style={s.price}>{option.product.priceString}</Text>
              </Pressable>
            ))}
          </View>
          <Pill testID="subscribe" primary big disabled={!item || busy} label={t('subscribe')} onPress={() => run(() => buy(userId, item!))} />
          <Pill testID="restore" plain disabled={busy} label={t('restore')} onPress={() => run(() => restore(userId))} />
        </>
      )}
      {failure ? <Text testID="paywall-message" style={ui.error}>{t(failure)}</Text> : null}
      <Hint>{t('renewalTerms')}</Hint>
      <View style={ui.row}>
        <Pill plain label={t('terms')} onPress={() => router.push('/legal?doc=terms')} />
        <Pill plain label={t('privacy')} onPress={() => router.push('/legal?doc=privacy')} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  plans: { flexDirection: 'row', gap: 10 },
  plan: { flex: 1, gap: 2, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: paper.line },
  planOn: { borderColor: paper.accent },
  tag: { fontSize: 12, fontWeight: '600', color: paper.muted },
  planName: { fontSize: 17, fontWeight: '600', color: paper.fg },
  price: { fontSize: 15, color: paper.muted },
});

import { bookName, planChapters, planDayOf, planProgress, PLAN_DAYS } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Group, Hint, IconButton, Pill, Row, Screen } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { useProScreen } from '@/lib/pro';
import { updateReader, useReader } from '@/lib/store';
import { paper } from '@/lib/theme';

export default function Plan() {
  const { t, locale } = useT();
  const allowed = useProScreen('readingPlan');
  const { plan } = useReader();
  const today = plan ? planDayOf(plan.startedAt, Date.now()) : 0;
  const [day, setDay] = useState(today);
  const [leaving, setLeaving] = useState(false);

  if (!allowed) return null;

  if (!plan) {
    return (
      <Screen title={t('readingPlan')} close testID="plan">
        <Hint>{t('planIntro')}</Hint>
        <Pill testID="plan-start" primary big label={t('planStart')} onPress={() => updateReader({ plan: { startedAt: Date.now(), done: [] } })} />
      </Screen>
    );
  }

  const done = plan.done.includes(day);
  const open = (book: string, chapter: number) => {
    updateReader({ book, chapter, verse: undefined });
    router.navigate('/bible');
  };

  return (
    <Screen title={t('readingPlan')} close testID="plan">
      <View style={s.track}><View style={[s.fill, { width: `${planProgress(plan.done) * 100}%` }]} /></View>
      <Hint testID="plan-progress">{t('planDone', { n: new Set(plan.done).size, total: PLAN_DAYS })}</Hint>
      <View style={s.days}>
        <IconButton testID="plan-prev" icon="chevron-back" label={t('previous')} disabled={day === 0} onPress={() => setDay(day - 1)} />
        <Hint testID="plan-day">{t('planDay', { n: day + 1 })}{day === today ? ` · ${t('today')}` : ''}</Hint>
        <IconButton testID="plan-next" icon="chevron-forward" label={t('next')} disabled={day === PLAN_DAYS - 1} onPress={() => setDay(day + 1)} />
      </View>
      <Group>
        {planChapters(day).map(({ book, chapter }) => (
          <Row key={`${book}-${chapter}`} testID="plan-chapter" label={`${bookName(book, locale)} ${chapter}`} onPress={() => open(book, chapter)} />
        ))}
      </Group>
      <Pill
        testID="plan-done"
        primary={!done}
        big
        icon={done ? 'check' : undefined}
        label={t(done ? 'planRead' : 'planMark')}
        onPress={() => updateReader({ plan: { ...plan, done: done ? plan.done.filter((d) => d !== day) : [...plan.done, day] } })}
      />
      {leaving ? (
        <Pill plain danger testID="plan-confirm-reset" label={t('planConfirmReset')} onPress={() => updateReader({ plan: null })} />
      ) : (
        <Pill plain testID="plan-reset" label={t('planReset')} onPress={() => setLeaving(true)} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: paper.soft },
  fill: { height: 6, backgroundColor: paper.mark },
  days: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

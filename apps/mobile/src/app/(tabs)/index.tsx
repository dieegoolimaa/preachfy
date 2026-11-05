import { bookName, planChapters, planDayOf, upcoming } from '@preachfy/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card, Group, Hint, Row, Screen, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { dateTime } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';
import { updateReader, useReader } from '@/lib/store';
import { paper, serif } from '@/lib/theme';
import { translationById } from '@/lib/translations';

const DAILY: [string, number, number][] = [
  ['PSA', 23, 1], ['JOH', 3, 16], ['ROM', 8, 28], ['PHP', 4, 13], ['ISA', 41, 10], ['PSA', 46, 1], ['PRO', 3, 5],
  ['MAT', 11, 28], ['JER', 29, 11], ['ROM', 12, 2], ['PSA', 119, 105], ['2CO', 5, 17], ['GAL', 2, 20], ['HEB', 11, 1],
  ['JOS', 1, 9], ['MAT', 6, 33], ['PSA', 27, 1], ['1JN', 4, 19], ['ISA', 40, 31], ['EPH', 2, 8], ['1PE', 5, 7],
  ['LAM', 3, 22], ['PSA', 37, 5], ['COL', 3, 23], ['JAS', 1, 5], ['ROM', 5, 8], ['JOH', 14, 6], ['MIC', 6, 8],
  ['PSA', 91, 1], ['HEB', 12, 2], ['1CO', 13, 13],
];

export default function Today() {
  const { t, locale } = useT();
  const { book, chapter, translation, studies, plan } = useReader();
  const [daily, setDaily] = useState('');
  const dayOfYear = Math.floor(Date.now() / 86_400_000);
  const [dailyBook, dailyChapter, dailyVerse] = DAILY[dayOfYear % DAILY.length]!;
  const next = upcoming(studies, Date.now())[0];
  const planFirst = plan ? planChapters(planDayOf(plan.startedAt, Date.now()))[0] : undefined;
  const recent = studies.filter((s) => !s.deletedAt).slice(0, 3);

  useEffect(() => {
    let live = true;
    loadBook(translation, dailyBook)
      .then((chapters) => live && setDaily(chapters[dailyChapter - 1]?.[dailyVerse - 1] ?? ''))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [translation, dailyBook, dailyChapter, dailyVerse]);

  const openDaily = () => {
    updateReader({ book: dailyBook, chapter: dailyChapter, verse: dailyVerse });
    router.navigate('/bible');
  };

  return (
    <Screen title={t('today')} testID="today">
      <Card testID="daily" onPress={openDaily}>
        <Text style={ui.label}>{t('verseOfDay')}</Text>
        <Text style={s.verse}>{daily}</Text>
        <Hint>{bookName(dailyBook, locale)} {dailyChapter}:{dailyVerse} · {translationById(translation).short}</Hint>
      </Card>

      <Group>
        {next ? (
          <Row testID="next-content" icon="calendar" label={next.title} detail={`${t('nextUp')} · ${dateTime(next.scheduledFor!, locale)}`} onPress={() => router.push(`/study/${next.id}`)} />
        ) : null}
        <Row
          testID="open-plan"
          icon="calendar"
          label={planFirst ? `${bookName(planFirst.book, locale)} ${planFirst.chapter}` : t('readingPlan')}
          detail={planFirst ? t('planToday') : t('planIntro')}
          onPress={() => requirePro('readingPlan') && router.push('/plan')}
        />
        <Row testID="continue" icon="book-fill" label={`${bookName(book, locale)} ${chapter}`} detail={t('continueReading')} onPress={() => router.navigate('/bible')} />
      </Group>

      {recent.length ? (
        <Group title={t('recent')}>
          {recent.map((study) => (
            <Row key={study.id} label={study.title} onPress={() => router.push(`/study/${study.id}`)} />
          ))}
        </Group>
      ) : null}

      <Group title={t('tryPulpit')} footer={t('tryPulpitHint')}>
        <Row testID="open-demo" icon="mic" label={t('openDemo')} onPress={() => router.push('/pulpit?id=demo')} />
      </Group>
    </Screen>
  );
}

const s = StyleSheet.create({ verse: { fontFamily: serif, fontSize: 22, lineHeight: 31, color: paper.fg } });

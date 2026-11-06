import { bookName, DAILY_VERSES, isReadyForPulpit, nextStudy, planChapters, planDayOf, stepsMissingBaseText, templateFor } from '@preachfy/core';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FadeIn, Group, Hint, Row, Screen, Segments, ui } from '@/components/ui';
import { loadBook } from '@/lib/bible';
import { dateTime } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';
import { updateReader, useReader } from '@/lib/store';
import { paper, serif, serifBold } from '@/lib/theme';
import { translationById } from '@/lib/translations';


const tags = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' } as const;

/** Opens on what to do now, not on a menu. */
export default function Today() {
  const { t, locale } = useT();
  const { book, chapter, translation, studies, plan } = useReader();
  const [daily, setDaily] = useState('');
  const dayOfYear = Math.floor(Date.now() / 86_400_000);
  const [dailyBook, dailyChapter, dailyVerse] = DAILY_VERSES[dayOfYear % DAILY_VERSES.length]!;
  const next = nextStudy(studies, Date.now());
  const template = next?.kind ? templateFor(next.kind) : null;
  const ready = next ? isReadyForPulpit(next) : false;
  const done = next ? next.steps.length - stepsMissingBaseText(next).length : 0;
  const planFirst = plan ? planChapters(planDayOf(plan.startedAt, Date.now()))[0] : undefined;

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

  const act = () => {
    if (!next) {
      if (requirePro('create')) router.push('/new');
    } else if (next.example || requirePro('pulpit')) {
      router.push(`/pulpit?id=${next.id}`);
    }
  };

  const kicker = next
    ? [template?.role[locale], next.scheduledFor ? dateTime(next.scheduledFor, locale) : null].filter(Boolean).join(' · ')
    : t('startLabel');

  return (
    <Screen title={t('today')} testID="today">
      <FadeIn>
        <Text style={s.date}>{new Date().toLocaleDateString(tags[locale], { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        <LinearGradient colors={['#FFF0A8', '#FFD43B']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.next} testID="next-card">
          <Text style={s.kicker}>{kicker.toUpperCase()}</Text>
          <Text style={s.nextTitle} testID="next-title">{next ? next.title : t('firstMessage')}</Text>
          {next ? <Segments done={done} total={Math.max(next.steps.length, 1)} onYellow /> : null}
          <Text style={s.nextText}>
            {next ? (ready ? t('ready') : `${t('stepsReady', { n: done, m: next.steps.length })} ${t('missingTexts', { n: next.steps.length - done })}`) : t('firstMessageHint')}
          </Text>
          <Pressable testID="next-cta" accessibilityRole="button" style={s.cta} onPress={act}>
            <Text style={s.ctaText}>
              {!next ? t('startPreparing') : `${template?.role[locale] ?? t('pulpit')} →`}
            </Text>
          </Pressable>
          {next && !ready ? (
            <Pressable testID="next-edit" accessibilityRole="button" onPress={() => router.push(`/study/${next.id}`)}>
              <Text style={s.editLink}>{t('continuePrep')}</Text>
            </Pressable>
          ) : null}
        </LinearGradient>
      </FadeIn>

      <Pressable testID="daily" style={s.daily} onPress={openDaily}>
        <Text style={ui.label}>{t('verseOfDay')}</Text>
        <Text style={s.verse}>{daily}</Text>
        <Hint>{bookName(dailyBook, locale)} {dailyChapter}:{dailyVerse} · {translationById(translation).short}</Hint>
      </Pressable>

      <Group>
        <Row
          testID="open-plan"
          label={planFirst ? `${bookName(planFirst.book, locale)} ${planFirst.chapter}` : t('readingPlan')}
          detail={planFirst ? t('planToday') : t('planIntro')}
          onPress={() => requirePro('readingPlan') && router.push('/plan')}
        />
        <Row testID="continue" label={`${bookName(book, locale)} ${chapter}`} detail={t('continueReading')} onPress={() => router.navigate('/bible')} />
      </Group>

      <Group footer={t('tryPulpitHint')}>
        <Row testID="open-demo" label={t('openDemo')} onPress={() => router.push('/pulpit?id=demo')} />
      </Group>
    </Screen>
  );
}

const s = StyleSheet.create({
  date: { fontSize: 13, color: paper.muted, marginBottom: 12, textTransform: 'capitalize' },
  next: { borderRadius: 26, padding: 20, gap: 12 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#16181DB3' },
  nextTitle: { fontFamily: serifBold, fontSize: 29, lineHeight: 32, letterSpacing: -0.4, color: '#16181D' },
  nextText: { fontSize: 14, lineHeight: 20, color: '#16181DCC' },
  cta: { minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16181D' },
  editLink: { fontSize: 15, fontWeight: '600', color: '#16181D', textAlign: 'center', paddingVertical: 6, textDecorationLine: 'underline' },
  ctaText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  daily: { gap: 6, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: paper.line },
  verse: { fontFamily: serif, fontSize: 21, lineHeight: 30, color: paper.fg },
});

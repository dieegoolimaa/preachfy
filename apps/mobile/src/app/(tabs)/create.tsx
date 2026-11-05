import { foldText, hasBaseText, TEMPLATES, templateFor, type StudyKind } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Chips, Field, Hint, Pill, Screen, Segments } from '@/components/ui';
import { dateTime } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';
import { useReader } from '@/lib/store';
import { paper, serifBold } from '@/lib/theme';

/** The place to start a message, and to find the ones already in progress. */
export default function Prepare() {
  const { t, locale } = useT();
  const { studies, runs } = useReader();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<StudyKind | null>(null);
  const needle = foldText(query.trim());
  const shown = studies
    .filter((study) => !study.deletedAt && (!kind || study.kind === kind) && (!needle || foldText(study.title).includes(needle)))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <Screen title={t('prepare')} testID="create">
      <Pill testID="new-study" primary big label={t('startPreparing')} onPress={() => requirePro('create') && router.push('/new')} />
      {studies.some((study) => !study.deletedAt) ? (
        <>
          <Field testID="library-search" value={query} onChangeText={setQuery} placeholder={t('searchLibrary')} />
          <Chips>
            {TEMPLATES.map((template) => (
              <Chip key={template.kind} testID={`filter-${template.kind}`} on={kind === template.kind} label={template.name[locale]} onPress={() => setKind(kind === template.kind ? null : template.kind)} />
            ))}
          </Chips>
        </>
      ) : (
        <Hint testID="library-empty">{t('libraryEmpty')}</Hint>
      )}
      {shown.length === 0 && studies.some((study) => !study.deletedAt) ? <Hint>{t('nothing')}</Hint> : null}
      {shown.map((study) => {
        const delivered = runs.filter((r) => r.studyId === study.id && !r.deletedAt).length;
        const done = study.steps.filter(hasBaseText).length;
        return (
          <Pressable key={study.id} testID="study-row" accessibilityRole="button" style={s.card} onPress={() => router.push(`/study/${study.id}`)}>
            <Text style={s.title}>{study.title}</Text>
            <Text style={s.meta}>
              {[
                study.kind ? templateFor(study.kind).name[locale] : null,
                delivered ? t('deliveredCount', { n: delivered }) : null,
                study.scheduledFor ? dateTime(study.scheduledFor, locale) : null,
              ].filter(Boolean).join(' · ')}
            </Text>
            <Segments done={done} total={Math.max(study.steps.length, 1)} />
            <Text style={s.meta}>{t('stepsReady', { n: done, m: study.steps.length })}</Text>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { gap: 8, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  title: { fontFamily: serifBold, fontSize: 22, lineHeight: 27, color: paper.fg },
  meta: { fontSize: 13, color: paper.muted },
});

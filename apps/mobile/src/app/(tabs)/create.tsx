import { foldText, TEMPLATES, templateFor, type StudyKind } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Field, Hint, Pill, Screen, ui } from '@/components/ui';
import { dateTime } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { requirePro } from '@/lib/pro';
import { useReader } from '@/lib/store';

export default function Create() {
  const { t, locale } = useT();
  const { studies, runs } = useReader();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<StudyKind | null>(null);
  const needle = foldText(query.trim());
  const shown = studies.filter(
    (s) => !s.deletedAt && (!kind || s.kind === kind) && (!needle || foldText(s.title).includes(needle)),
  );

  return (
    <Screen
      title={t('create')}
      testID="create"
      right={<Pill testID="new-study" primary label={t('newContent')} onPress={() => requirePro('create') && router.push('/new')} />}>
      <Field testID="library-search" value={query} onChangeText={setQuery} placeholder={t('searchLibrary')} />
      <View style={ui.row}>
        {TEMPLATES.map((template) => (
          <Pill
            key={template.kind}
            testID={`filter-${template.kind}`}
            primary={kind === template.kind}
            label={template.name[locale]}
            onPress={() => setKind(kind === template.kind ? null : template.kind)}
          />
        ))}
      </View>
      {shown.length === 0 ? <Hint testID="library-empty">{studies.some((s) => !s.deletedAt) ? t('nothing') : t('libraryEmpty')}</Hint> : null}
      {shown.map((study) => {
        const delivered = runs.filter((r) => r.studyId === study.id && !r.deletedAt).length;
        return (
          <Card key={study.id} testID="study-row" onPress={() => router.push(`/study/${study.id}`)}>
            <Text style={ui.cardTitle}>{study.title}</Text>
            <Hint>
              {[
                study.kind ? templateFor(study.kind).name[locale] : null,
                t('stepsCount', { n: study.steps.length }),
                delivered ? t('deliveredCount', { n: delivered }) : null,
                study.scheduledFor ? dateTime(study.scheduledFor, locale) : null,
              ].filter(Boolean).join(' · ')}
            </Hint>
          </Card>
        );
      })}
    </Screen>
  );
}

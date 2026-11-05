import { foldText, TEMPLATES, templateFor, type StudyKind } from '@preachfy/core';
import { router } from 'expo-router';
import { useState } from 'react';

import { Chip, Chips, Field, Group, Hint, IconButton, Row, Screen } from '@/components/ui';
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
      right={<IconButton testID="new-study" icon="add-circle" label={t('newContent')} onPress={() => requirePro('create') && router.push('/new')} />}>
      <Field testID="library-search" value={query} onChangeText={setQuery} placeholder={t('searchLibrary')} />
      <Chips>
        {TEMPLATES.map((template) => (
          <Chip
            key={template.kind}
            testID={`filter-${template.kind}`}
            on={kind === template.kind}
            label={template.name[locale]}
            onPress={() => setKind(kind === template.kind ? null : template.kind)}
          />
        ))}
      </Chips>
      {shown.length === 0 ? <Hint testID="library-empty">{studies.some((s) => !s.deletedAt) ? t('nothing') : t('libraryEmpty')}</Hint> : null}
      {shown.length ? (
        <Group>
          {shown.map((study) => {
            const delivered = runs.filter((r) => r.studyId === study.id && !r.deletedAt).length;
            return (
              <Row
                key={study.id}
                testID="study-row"
                label={study.title}
                detail={[
                  study.kind ? templateFor(study.kind).name[locale] : null,
                  t('stepsCount', { n: study.steps.length }),
                  delivered ? t('deliveredCount', { n: delivered }) : null,
                  study.scheduledFor ? dateTime(study.scheduledFor, locale) : null,
                ].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/study/${study.id}`)}
              />
            );
          })}
        </Group>
      ) : null}
    </Screen>
  );
}

import { bookName, buildStudy, marksInPassage, TEMPLATES, type Passage, type StudyKind } from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Chip, Chips, Field, Group, Hint, Pill, Row, Screen, ui } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { resolvePassage } from '@/lib/passage';
import { saveStudy, useReader } from '@/lib/store';

export default function NewContent() {
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ passage?: string }>();
  const { book, chapter, translation, marks } = useReader();
  const [reference, setReference] = useState(params.passage ?? `${bookName(book, locale)} ${chapter}`);
  const [kind, setKind] = useState<StudyKind>('outline');
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState<Passage | null>(null);

  useEffect(() => {
    let live = true;
    resolvePassage(reference, locale, translation).then((found) => live && setPassage(found));
    return () => {
      live = false;
    };
  }, [reference, locale, translation]);

  const label = passage ? `${bookName(passage.book, locale)} ${passage.chapter}:${passage.from}–${passage.to}` : '';
  const fed = passage ? marksInPassage(marks, passage).length : 0;

  const create = () => {
    if (!passage) return;
    const id = newId();
    saveStudy(buildStudy({ id, kind, title: title.trim() || label, passage, marks, locale, now: Date.now(), newId }));
    router.replace(`/study/${id}`);
  };

  return (
    <Screen title={t('newContent')} close testID="new">
      <Field testID="passage" label={t('step1Passage')} value={reference} onChangeText={setReference} placeholder={t('passageHint')} autoCorrect={false} />
      {passage ? (
        <Hint testID="passage-ok">{label}{fed ? ` · ${t('marksFound', { n: fed })}` : ''}</Hint>
      ) : (
        <Text testID="passage-error" style={ui.error}>{t('passageInvalid')}</Text>
      )}

      <Text style={ui.fieldLabel}>{t('step2Type')}</Text>
      <Chips>
        {TEMPLATES.map((template) => (
          <Chip key={template.kind} testID={`kind-${template.kind}`} on={kind === template.kind} label={template.name[locale]} onPress={() => setKind(template.kind)} />
        ))}
        <Chip testID="kind-card" label={t('verseCard')} disabled={!passage} onPress={() => router.replace({ pathname: '/card', params: { reference } })} />
      </Chips>

      <Field testID="title" label={t('step3Title')} value={title} onChangeText={setTitle} placeholder={label || t('titleLabel')} />
      <Group>
        {TEMPLATES.find((x) => x.kind === kind)!.sections.map((section) => (
          <Row key={section.title.en} label={section.title[locale]} value={t('minutes', { n: section.minutes })} />
        ))}
      </Group>
      <Pill testID="create-study" primary big disabled={!passage} label={t('createNow')} onPress={create} />
    </Screen>
  );
}

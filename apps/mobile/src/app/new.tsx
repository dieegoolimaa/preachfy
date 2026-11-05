import { bookName, buildStudy, marksInPassage, TEMPLATES, type Passage, type StudyKind } from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Field, Heading, Hint, Pill, Screen, ui } from '@/components/ui';
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
      <Heading>{t('step1Passage')}</Heading>
      <Field testID="passage" value={reference} onChangeText={setReference} placeholder={t('passageHint')} autoCorrect={false} />
      {passage ? (
        <Hint testID="passage-ok">{label}{fed ? ` · ${t('marksFound', { n: fed })}` : ''}</Hint>
      ) : (
        <Text testID="passage-error" style={ui.error}>{t('passageInvalid')}</Text>
      )}

      <Heading>{t('step2Type')}</Heading>
      <View style={ui.row}>
        {TEMPLATES.map((template) => (
          <Pill key={template.kind} testID={`kind-${template.kind}`} primary={kind === template.kind} label={template.name[locale]} onPress={() => setKind(template.kind)} />
        ))}
        <Pill testID="kind-card" label={t('verseCard')} disabled={!passage} onPress={() => router.replace({ pathname: '/card', params: { reference } })} />
      </View>

      <Heading>{t('step3Title')}</Heading>
      <Field testID="title" value={title} onChangeText={setTitle} placeholder={label || t('titleLabel')} />
      <Card>
        {TEMPLATES.find((x) => x.kind === kind)!.sections.map((section) => (
          <Hint key={section.title.en}>{section.title[locale]} · {t('minutes', { n: section.minutes })}</Hint>
        ))}
      </Card>
      <Pill testID="create-study" primary disabled={!passage} label={t('createNow')} onPress={create} />
    </Screen>
  );
}

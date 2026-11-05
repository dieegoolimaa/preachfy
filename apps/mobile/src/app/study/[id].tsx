import {
  bookName, hasBaseText, isReadyForPulpit, passageText, stepsMissingBaseText, stepSuggestions, templateFor,
  type Step, type Study, type StudyText,
} from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { LivePanel } from '@/components/LivePanel';
import { Card, Field, Heading, Hint, Pill, Screen, ui } from '@/components/ui';
import { fromInput, dateTime, toInput } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { goBack } from '@/lib/navigation';
import { resolvePassage } from '@/lib/passage';
import { requirePro, usePro } from '@/lib/pro';
import { saveStudy, useReader } from '@/lib/store';
import { renderStudy, useRendered } from '@/lib/studyText';
import { categoryColor, paper, sansSemi, serif } from '@/lib/theme';

type BaseProps = { value: StudyText | undefined; onChange: (text: StudyText | undefined) => void; translationId: string; editable: boolean; testID: string };

/** A text is a Bible reference or free text, such as the key sentence of a talk. */
function TextEditor({ value, onChange, translationId, editable, testID }: BaseProps) {
  const { t, locale } = useT();
  const rendered = useRendered(value, locale);
  const [authored, setAuthored] = useState(value?.kind === 'authored');
  const [reference, setReference] = useState('');
  const [invalid, setInvalid] = useState(false);

  const apply = async () => {
    if (!reference.trim()) return;
    const passage = await resolvePassage(reference, locale, translationId);
    setInvalid(!passage);
    if (passage) {
      onChange(passageText(passage));
      setReference('');
    }
  };

  return (
    <View style={s.text}>
      {rendered?.label ? <Text style={ui.label}>{rendered.label}</Text> : null}
      {value?.kind === 'scripture' ? <Text testID={`${testID}-preview`} style={s.scripture}>{rendered?.body}</Text> : null}
      {editable ? (
        <>
          <View style={ui.row}>
            <Pill testID={`${testID}-bible`} primary={!authored} label={t('bibleText')} onPress={() => setAuthored(false)} />
            <Pill testID={`${testID}-authored`} primary={authored} label={t('ownText')} onPress={() => setAuthored(true)} />
            {value ? <Pill testID={`${testID}-clear`} label={t('remove')} onPress={() => onChange(undefined)} /> : null}
          </View>
          {authored ? (
            <Field
              testID={`${testID}-own`}
              multiline
              value={value?.kind === 'authored' ? value.text : ''}
              onChangeText={(text) => onChange({ kind: 'authored', text })}
              placeholder={t('ownTextHint')}
            />
          ) : (
            <Field
              testID={`${testID}-ref`}
              value={reference}
              onChangeText={setReference}
              onBlur={apply}
              onSubmitEditing={apply}
              placeholder={t('passageHint')}
              autoCorrect={false}
            />
          )}
          {invalid ? <Text style={ui.error}>{t('passageInvalid')}</Text> : null}
        </>
      ) : value?.kind === 'authored' ? (
        <Text style={s.scripture}>{value.text}</Text>
      ) : null}
    </View>
  );
}

type StepProps = {
  study: Study; step: Step; index: number; open: boolean; editable: boolean;
  onToggle: () => void; onChange: (patch: Partial<Step>) => void; onMove: (delta: number) => void; onRemove: () => void;
};

function StepEditor({ study, step, index, open, editable, onToggle, onChange, onMove, onRemove }: StepProps) {
  const { t } = useT();
  const suggestions = stepSuggestions(study, step);
  const translationId = study.passage?.translationId ?? 'blivre';
  const missing = !hasBaseText(step);

  return (
    <Card testID={`step-${index}`}>
      <Pressable testID={`step-${index}-toggle`} style={s.stepHead} onPress={onToggle}>
        <Text style={s.number}>{index + 1}</Text>
        <View style={s.stepTitle}>
          <Text style={ui.cardTitle}>{step.title}</Text>
          <Hint>{t('minutes', { n: Math.round(step.plannedMs / 60_000) })}{missing ? ` · ${t('noBaseText')}` : ''}</Hint>
        </View>
      </Pressable>
      {open ? (
        <View style={s.stepBody}>
          {step.guidance ? <Hint>{step.guidance}</Hint> : null}
          <Field testID={`step-${index}-title`} label={t('titleLabel')} editable={editable} value={step.title} onChangeText={(title) => onChange({ title })} />
          <Field
            testID={`step-${index}-minutes`}
            label={t('minutesLabel')}
            editable={editable}
            keyboardType="number-pad"
            value={String(Math.round(step.plannedMs / 60_000))}
            onChangeText={(value) => onChange({ plannedMs: (Number(value.replace(/\D/g, '')) || 0) * 60_000 })}
          />
          <Heading>{t('baseText')}</Heading>
          <TextEditor testID={`step-${index}-base`} value={step.baseText} onChange={(baseText) => onChange({ baseText })} translationId={translationId} editable={editable} />
          {suggestions.length ? (
            <>
              <Heading>{t('fromYourStudy')}</Heading>
              {suggestions.map((mark) => (
                <Pressable
                  key={mark.id}
                  testID={`suggestion-${index}`}
                  disabled={!editable}
                  style={[s.suggestion, { borderLeftColor: categoryColor(mark.categoryKey) }]}
                  onPress={() => onChange({ baseText: { kind: 'scripture', spans: mark.spans } })}>
                  <Text style={s.suggestionText}>{mark.spans.map((x) => x.quote).filter(Boolean).join(' ') || verseOf(mark)}</Text>
                  {mark.note ? <Hint>{mark.note}</Hint> : null}
                </Pressable>
              ))}
            </>
          ) : null}
          <Field testID={`step-${index}-notes`} label={t('manuscript')} multiline editable={editable} value={step.notes} onChangeText={(notes) => onChange({ notes })} placeholder={t('notesHint')} />
          <Field testID={`step-${index}-outline`} label={t('outlineLevel')} multiline editable={editable} value={step.outline ?? ''} onChangeText={(outline) => onChange({ outline })} />
          <Field testID={`step-${index}-keywords`} label={t('keywordsLevel')} editable={editable} value={step.keywords ?? ''} onChangeText={(keywords) => onChange({ keywords })} />
          <Field testID={`step-${index}-question`} label={t('questionLabel')} editable={editable} value={step.question ?? ''} onChangeText={(question) => onChange({ question })} />
          <Field testID={`step-${index}-expected`} label={t('expectedAnswer')} editable={editable} value={step.expectedAnswer ?? ''} onChangeText={(expectedAnswer) => onChange({ expectedAnswer })} />
          {editable ? (
            <View style={ui.row}>
              <Pill testID={`step-${index}-up`} label="↑" onPress={() => onMove(-1)} />
              <Pill testID={`step-${index}-down`} label="↓" onPress={() => onMove(1)} />
              <Pill testID={`step-${index}-remove`} label={t('remove')} onPress={onRemove} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const verseOf = (mark: { spans: { ref: { chapter: number; verse: number } }[] }) => {
  const ref = mark.spans[0]?.ref;
  return ref ? `${ref.chapter}:${ref.verse}` : '';
};

export default function StudyEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { studies, runs } = useReader();
  const pro = usePro();
  const study = studies.find((s) => s.id === id && !s.deletedAt);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [date, setDate] = useState(toInput(study?.scheduledFor));
  const [confirming, setConfirming] = useState(false);

  if (!study) {
    return (
      <Screen title={t('create')} close>
        <Hint testID="study-missing">{t('nothing')}</Hint>
      </Screen>
    );
  }

  const change = (patch: Partial<Study>) => saveStudy({ ...study, ...patch });
  const changeStep = (stepId: string, patch: Partial<Step>) =>
    change({ steps: study.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)) });
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= study.steps.length) return;
    const steps = [...study.steps];
    [steps[index], steps[target]] = [steps[target]!, steps[index]!];
    change({ steps });
  };
  const addStep = () => {
    const step: Step = { id: newId(), title: t('newStep'), notes: '', plannedMs: 300_000 };
    change({ steps: [...study.steps, step] });
    setOpenStep(step.id);
  };

  const missing = stepsMissingBaseText(study);
  const ready = isReadyForPulpit(study);
  const delivered = runs.filter((r) => r.studyId === study.id && !r.deletedAt).sort((a, b) => b.startedAt - a.startedAt);
  const template = study.kind ? templateFor(study.kind) : null;
  const totalMinutes = Math.round(study.steps.reduce((sum, step) => sum + step.plannedMs, 0) / 60_000);

  const shareText = async () => {
    const { steps } = await renderStudy(study, locale);
    const body = study.steps.map((step, i) =>
      [`${i + 1}. ${step.title}`, steps[i] ? [steps[i]!.label, steps[i]!.body].filter(Boolean).join('\n') : '', step.notes].filter(Boolean).join('\n'),
    );
    await Share.share({ message: [study.title, ...body, t('madeWith')].join('\n\n') });
  };

  return (
    <Screen title={study.title} close testID="study">
      {!pro ? <Hint testID="read-only">{t('readOnlyHint')}</Hint> : null}
      <Field testID="study-title" label={t('titleLabel')} editable={pro} value={study.title} onChangeText={(title) => change({ title })} />
      {template?.goal ? (
        <Field testID="study-goal" label={template.goal[locale]} multiline editable={pro} value={study.goal ?? ''} onChangeText={(goal) => change({ goal })} />
      ) : null}
      <Field
        testID="study-date"
        label={t('dateLabel')}
        editable={pro}
        value={date}
        placeholder="2026-11-08 19:30"
        onChangeText={(value) => {
          setDate(value);
          const at = fromInput(value);
          if (at !== undefined || !value.trim()) change({ scheduledFor: at });
        }}
      />

      <Heading>{t('contextText')}</Heading>
      <Hint>{t('contextHint')}</Hint>
      <TextEditor testID="context" value={study.context} onChange={(context) => change({ context })} translationId={study.passage?.translationId ?? 'blivre'} editable={pro} />

      <Heading>{t('stepsTitle', { n: study.steps.length, m: totalMinutes })}</Heading>
      {study.steps.map((step, index) => (
        <StepEditor
          key={step.id}
          study={study}
          step={step}
          index={index}
          editable={pro}
          open={openStep === step.id}
          onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
          onChange={(patch) => changeStep(step.id, patch)}
          onMove={(delta) => move(index, delta)}
          onRemove={() => change({ steps: study.steps.filter((item) => item.id !== step.id) })}
        />
      ))}
      {pro ? <Pill testID="add-step" label={t('addStep')} onPress={addStep} /> : null}

      <Heading>{t('deliver')}</Heading>
      {ready ? null : (
        <Hint testID="missing-base">{t('missingBase', { list: missing.map((step) => step.title).join(', ') })}</Hint>
      )}
      <View style={ui.row}>
        <Pill
          testID="open-pulpit"
          primary
          disabled={!ready}
          label={template?.role[locale] ?? t('pulpit')}
          onPress={() => requirePro('pulpit') && router.push(`/pulpit?id=${study.id}`)}
        />
        <Pill testID="share-study" label={t('share')} onPress={shareText} />
      </View>
      <LivePanel study={study} />

      {delivered.length ? <Heading>{t('history')}</Heading> : null}
      {delivered.map((run) => (
        <Card key={run.id} testID="run-row">
          <Text style={s.runTitle}>{dateTime(run.startedAt, locale)}{run.place ? ` · ${run.place}` : ''}</Text>
          <Hint>{t('runSummary', { real: Math.round((run.endedAt - run.startedAt) / 60_000), planned: Math.round(run.plannedMs / 60_000) })}</Hint>
          {run.note ? <Hint>{run.note}</Hint> : null}
        </Card>
      ))}

      {study.passage ? <Hint>{bookName(study.passage.book, locale)} {study.passage.chapter}:{study.passage.from}–{study.passage.to}</Hint> : null}
      {confirming ? (
        <View style={ui.row}>
          <Pill
            testID="confirm-delete-study"
            primary
            label={t('confirmDeleteStudy')}
            onPress={() => {
              change({ deletedAt: Date.now() });
              goBack();
            }}
          />
          <Pill label={t('cancel')} onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <Pill testID="delete-study" label={t('deleteStudy')} onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  text: { gap: 8 },
  scripture: { fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
  stepHead: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
  number: { width: 28, fontSize: 15, fontFamily: sansSemi, color: paper.accent },
  stepTitle: { flex: 1 },
  stepBody: { gap: 12, marginTop: 8 },
  suggestion: { gap: 4, padding: 10, borderLeftWidth: 4, borderRadius: 6, backgroundColor: paper.soft },
  suggestionText: { fontFamily: serif, fontSize: 16, color: paper.fg },
  runTitle: { fontSize: 15, fontFamily: sansSemi, color: paper.fg },
});

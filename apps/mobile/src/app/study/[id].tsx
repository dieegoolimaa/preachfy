import {
  bookName, hasBaseText, isReadyForPulpit, passageText, stepsMissingBaseText, stepSuggestions, templateFor,
  type Step, type StepDetail, type Study, type StudyText,
} from '@preachfy/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LivePanel } from '@/components/LivePanel';
import { RunAudio } from '@/components/RunAudio';
import { Field, Group, Hint, IconButton, Pill, Screen, Segmented, ui } from '@/components/ui';
import { dateTime, fromInput, toInput } from '@/lib/dates';
import { shareHandout } from '@/lib/handout';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { goBack } from '@/lib/navigation';
import { resolvePassage } from '@/lib/passage';
import { requirePro, usePro } from '@/lib/pro';
import { canRecord } from '@/lib/recording';
import { saveStudy, useReader } from '@/lib/store';
import { renderStudy, useRendered } from '@/lib/studyText';
import { categoryColor, paper, serif, serifBold } from '@/lib/theme';

type TextEditorProps = { value: StudyText | undefined; onChange: (text: StudyText | undefined) => void; translationId: string; editable: boolean; testID: string };

/** A text is a Bible reference or free text, such as the key sentence of a talk. */
function TextEditor({ value, onChange, translationId, editable, testID }: TextEditorProps) {
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
          <Segmented
            value={authored ? 'own' : 'bible'}
            onChange={(key) => setAuthored(key === 'own')}
            options={[
              { key: 'bible', label: t('bibleText'), testID: `${testID}-bible` },
              { key: 'own', label: t('ownText'), testID: `${testID}-authored` },
            ]}
          />
          {authored ? (
            <Field testID={`${testID}-own`} multiline value={value?.kind === 'authored' ? value.text : ''} onChangeText={(text) => onChange({ kind: 'authored', text })} placeholder={t('ownTextHint')} />
          ) : (
            <Field testID={`${testID}-ref`} value={reference} onChangeText={setReference} onBlur={apply} onSubmitEditing={apply} placeholder={t('passageHint')} autoCorrect={false} />
          )}
          {invalid ? <Text style={ui.error}>{t('passageInvalid')}</Text> : null}
          {value ? <Pill plain danger testID={`${testID}-clear`} label={t('remove')} onPress={() => onChange(undefined)} /> : null}
        </>
      ) : value?.kind === 'authored' ? (
        <Text style={s.scripture}>{value.text}</Text>
      ) : null}
    </View>
  );
}

/** The base text as the speaker will see it, so a step can be judged at a glance. */
function BasePreview({ text }: { text: StudyText | undefined }) {
  const { locale } = useT();
  const rendered = useRendered(text, locale);
  if (!text || !rendered?.body) return null;
  return (
    <View style={s.base}>
      {rendered.label ? <Text style={ui.label}>{rendered.label}</Text> : null}
      <Text style={s.baseText} numberOfLines={3}>{rendered.body}</Text>
    </View>
  );
}

const verseLabel = (mark: { spans: { ref: { chapter: number; verse: number } }[] }) => {
  const ref = mark.spans[0]?.ref;
  return ref ? `${ref.chapter}:${ref.verse}` : '';
};

type StepProps = {
  study: Study; step: Step; index: number; last: boolean; open: boolean; editable: boolean;
  onToggle: () => void; onChange: (patch: Partial<Step>) => void; onMove: (delta: number) => void; onRemove: () => void;
};

function StepCard({ study, step, index, last, open, editable, onToggle, onChange, onMove, onRemove }: StepProps) {
  const { t } = useT();
  const [level, setLevel] = useState<StepDetail>('manuscript');
  const suggestions = stepSuggestions(study, step);
  const translationId = study.passage?.translationId ?? 'blivre';
  const missing = !hasBaseText(step);
  const levels = [
    { key: 'manuscript' as const, label: t('manuscript'), testID: `step-${index}-level-manuscript` },
    { key: 'outline' as const, label: t('outlineLevel'), testID: `step-${index}-level-outline` },
    { key: 'keywords' as const, label: t('keywordsLevel'), testID: `step-${index}-level-keywords` },
  ];

  return (
    <View style={s.stepRow} testID={`step-${index}`}>
      <View style={s.rail}>
        <View style={[s.node, missing && s.nodeMissing]}><Text style={[s.nodeText, missing && s.nodeTextMissing]}>{index + 1}</Text></View>
        {last ? null : <View style={s.line} />}
      </View>
      <View style={s.stepBody}>
        <Pressable testID={`step-${index}-toggle`} accessibilityRole="button" accessibilityLabel={t('showStep')} style={s.stepHead} onPress={onToggle}>
          <View style={s.stepTitle}>
            <Text style={s.stepName}>{step.title}</Text>
            <Text style={[s.stepMeta, missing && s.stepMissing]}>{t('minutes', { n: Math.round(step.plannedMs / 60_000) })}{missing ? ` · ${t('noBaseText')}` : ''}</Text>
          </View>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={paper.muted} />
        </Pressable>

        {open ? null : (
          <>
            <BasePreview text={step.baseText} />
            {step.notes ? <Text style={s.snippet} numberOfLines={2}>{step.notes}</Text> : null}
          </>
        )}

        {open ? (
          <View style={s.edit}>
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

            <Text style={ui.fieldLabel}>{t('baseText')}</Text>
            <TextEditor testID={`step-${index}-base`} value={step.baseText} onChange={(baseText) => onChange({ baseText })} translationId={translationId} editable={editable} />
            {suggestions.length ? (
              <>
                <Text style={ui.fieldLabel}>{t('fromYourStudy')}</Text>
                {suggestions.map((mark) => (
                  <Pressable
                    key={mark.id}
                    testID={`suggestion-${index}`}
                    disabled={!editable}
                    style={[s.suggestion, { borderLeftColor: categoryColor(mark.categoryKey) }]}
                    onPress={() => onChange({ baseText: { kind: 'scripture', spans: mark.spans } })}>
                    <Text style={s.suggestionText}>{mark.spans.map((x) => x.quote).filter(Boolean).join(' ') || verseLabel(mark)}</Text>
                    {mark.note ? <Hint>{mark.note}</Hint> : null}
                  </Pressable>
                ))}
              </>
            ) : null}

            <Text style={ui.fieldLabel}>{t('stepLevels')}</Text>
            <Segmented value={level} onChange={setLevel} options={levels} />
            {level === 'manuscript' ? <Field testID={`step-${index}-notes`} multiline editable={editable} value={step.notes} onChangeText={(notes) => onChange({ notes })} placeholder={t('notesHint')} /> : null}
            {level === 'outline' ? <Field testID={`step-${index}-outline`} multiline editable={editable} value={step.outline ?? ''} onChangeText={(outline) => onChange({ outline })} /> : null}
            {level === 'keywords' ? <Field testID={`step-${index}-keywords`} editable={editable} value={step.keywords ?? ''} onChangeText={(keywords) => onChange({ keywords })} /> : null}

            <Text style={ui.fieldLabel}>{t('forTheClass')}</Text>
            <Field testID={`step-${index}-question`} label={t('questionLabel')} editable={editable} value={step.question ?? ''} onChangeText={(question) => onChange({ question })} />
            <Field testID={`step-${index}-expected`} label={t('expectedAnswer')} editable={editable} value={step.expectedAnswer ?? ''} onChangeText={(expectedAnswer) => onChange({ expectedAnswer })} />

            {editable ? (
              <View style={ui.row}>
                <IconButton testID={`step-${index}-up`} icon="arrow-up" label={t('previous')} onPress={() => onMove(-1)} />
                <IconButton testID={`step-${index}-down`} icon="arrow-down" label={t('next')} onPress={() => onMove(1)} />
                <Pill plain danger testID={`step-${index}-remove`} label={t('remove')} onPress={onRemove} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function StudyEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { studies, runs } = useReader();
  const pro = usePro();
  const study = studies.find((x) => x.id === id && !x.deletedAt);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [date, setDate] = useState(toInput(study?.scheduledFor));
  const [confirming, setConfirming] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [titleHeight, setTitleHeight] = useState(46);

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
  const passageLabel = study.passage ? `${bookName(study.passage.book, locale)} ${study.passage.chapter}:${study.passage.from}–${study.passage.to}` : '';

  const shareText = async () => {
    const { steps } = await renderStudy(study, locale);
    const body = study.steps.map((step, i) =>
      [`${i + 1}. ${step.title}`, steps[i] ? [steps[i]!.label, steps[i]!.body].filter(Boolean).join('\n') : '', step.notes].filter(Boolean).join('\n'),
    );
    await Share.share({ message: [study.title, ...body, t('madeWith')].join('\n\n') });
  };

  return (
    <Screen
      title={template?.name[locale] ?? t('create')}
      close
      testID="study"
      right={<IconButton testID="share-study" icon="share" label={t('share')} onPress={shareText} />}>
      <View style={s.head}>
        <TextInput testID="study-title" style={[s.title, { height: titleHeight }]} editable={pro} multiline scrollEnabled={false} onContentSizeChange={(e) => setTitleHeight(Math.max(e.nativeEvent.contentSize.height, 40))} value={study.title} onChangeText={(title) => change({ title })} placeholder={t('titleLabel')} placeholderTextColor={paper.muted} />
        <Text style={s.meta}>{[passageLabel, t('stepsCount', { n: study.steps.length }), t('minutes', { n: totalMinutes })].filter(Boolean).join(' · ')}</Text>
      </View>
      {!pro ? <Hint testID="read-only">{t('readOnlyHint')}</Hint> : null}

      <View style={s.deliver}>
        <Text style={[s.status, ready ? s.statusReady : s.statusMissing]} testID={ready ? 'ready' : 'missing-base'}>
          {ready ? t('ready') : t('missingBase', { list: missing.map((step) => step.title).join(', ') })}
        </Text>
        <Pill
          testID="open-pulpit"
          primary
          big
          disabled={!ready}
          label={template?.role[locale] ?? t('pulpit')}
          onPress={() => requirePro('pulpit') && router.push(`/pulpit?id=${study.id}`)}
        />
      </View>

      {template?.goal ? (
        <Field testID="study-goal" label={template.goal[locale]} multiline editable={pro} value={study.goal ?? ''} onChangeText={(goal) => change({ goal })} />
      ) : null}

      <Text style={ui.fieldLabel}>{t('flowTitle')}</Text>
      <View>
        {study.steps.map((step, index) => (
          <StepCard
            key={step.id}
            study={study}
            step={step}
            index={index}
            last={index === study.steps.length - 1}
            editable={pro}
            open={openStep === step.id}
            onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
            onChange={(patch) => changeStep(step.id, patch)}
            onMove={(delta) => move(index, delta)}
            onRemove={() => change({ steps: study.steps.filter((item) => item.id !== step.id) })}
          />
        ))}
      </View>
      {pro ? <Pill testID="add-step" plain label={t('addStep')} onPress={addStep} /> : null}
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

      <View>
        <Pressable testID="context-toggle" accessibilityRole="button" style={s.contextHead} onPress={() => setContextOpen(!contextOpen)}>
          <View style={s.stepTitle}>
            <Text style={ui.fieldLabel}>{t('contextText')}</Text>
            <Hint>{t('contextHint')}</Hint>
          </View>
          <Icon name={contextOpen ? 'chevron-up' : 'chevron-down'} size={18} color={paper.muted} />
        </Pressable>
        {contextOpen || study.context ? <TextEditor testID="context" value={study.context} onChange={(context) => change({ context })} translationId={study.passage?.translationId ?? 'blivre'} editable={pro} /> : null}
      </View>


      <Group title={t('deliver')} />
      <Pill testID="handout" big label={t('handout')} onPress={() => requirePro('pdf') && shareHandout(study, locale, t('madeWith'))} />
      <LivePanel study={study} />

      {delivered.length ? <Group title={t('history')} /> : null}
      {delivered.map((run) => (
        <View key={run.id} testID="run-row" style={s.run}>
          <Text style={s.runTitle}>{dateTime(run.startedAt, locale)}{run.place ? ` · ${run.place}` : ''}</Text>
          <Hint>{t('runSummary', { real: Math.round((run.endedAt - run.startedAt) / 60_000), planned: Math.round(run.plannedMs / 60_000) })}</Hint>
          {run.note ? <Hint>{run.note}</Hint> : null}
          {run.audio && canRecord ? <RunAudio run={run} study={study} /> : null}
        </View>
      ))}

      {confirming ? (
        <View style={ui.row}>
          <Pill testID="confirm-delete-study" primary label={t('confirmDeleteStudy')} onPress={() => { change({ deletedAt: Date.now() }); goBack(); }} />
          <Pill plain label={t('cancel')} onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <Pill plain danger testID="delete-study" label={t('deleteStudy')} onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { gap: 6 },
  title: { fontFamily: serifBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: paper.fg, paddingHorizontal: 0, paddingVertical: 0 },
  meta: { fontSize: 14, color: paper.muted },
  deliver: { gap: 10 },
  status: { fontSize: 14, lineHeight: 20 },
  statusReady: { color: paper.fg, fontWeight: '600' },
  statusMissing: { color: paper.warn },
  text: { gap: 10 },
  scripture: { fontFamily: serif, fontSize: 18, lineHeight: 26, color: paper.fg },
  contextHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, marginBottom: 6 },
  stepRow: { flexDirection: 'row', gap: 14 },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: paper.accent },
  nodeMissing: { backgroundColor: paper.bg, borderWidth: 1.5, borderColor: paper.warn },
  nodeText: { fontSize: 14, fontWeight: '700', color: paper.accentFg, fontVariant: ['tabular-nums'] },
  nodeTextMissing: { color: paper.warn },
  line: { flex: 1, width: 2, marginVertical: 4, backgroundColor: paper.line },
  stepBody: { flex: 1, minWidth: 0, gap: 8, paddingBottom: 26 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  stepTitle: { flex: 1, gap: 2 },
  stepName: { fontFamily: serifBold, fontSize: 21, lineHeight: 26, color: paper.fg },
  stepMeta: { fontSize: 13, color: paper.muted },
  stepMissing: { color: paper.warn },
  base: { gap: 3, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: paper.mark },
  baseText: { fontFamily: serif, fontSize: 17, lineHeight: 24, color: paper.fg },
  snippet: { fontSize: 14, lineHeight: 20, color: paper.muted },
  edit: { gap: 12, paddingTop: 4 },
  suggestion: { gap: 4, padding: 12, borderLeftWidth: 4, backgroundColor: paper.soft },
  suggestionText: { fontFamily: serif, fontSize: 16, color: paper.fg },
  run: { gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line },
  runTitle: { fontSize: 15, fontWeight: '600', color: paper.fg },
});

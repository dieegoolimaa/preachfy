import {
  goTo, isPaused, isReadyForPulpit, pace, pause, pulpitSections, remaining, resume, spentInSection, startSession,
  stepBody, timerState, totalPlanned, type PulpitRun, type PulpitSession, type StepDetail, type Study,
} from '@preachfy/core';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Qr } from '@/components/Qr';
import { apiFetch } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { classLink, pushStep, screenLink } from '@/lib/live';
import { goBack } from '@/lib/navigation';
import { demoStudy } from '@/lib/sample';
import { getReader, isPro, updateReader, useReader } from '@/lib/store';
import { renderStudy, type Rendered } from '@/lib/studyText';
import { paper, sans, sansBold, sansSemi, serif, stage, type Theme } from '@/lib/theme';

function clock(ms: number) {
  const seconds = Math.round(Math.abs(ms) / 1000);
  const text = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return ms < 0 ? `+${text}` : text;
}

const saveSession = (id: string, session: PulpitSession | null) => {
  const { [id]: _old, ...rest } = getReader().sessions;
  updateReader({ sessions: session ? { ...rest, [id]: session } : rest });
};

type Texts = { steps: (Rendered | null)[]; context: Rendered | null };
type Answer = { id: string; nickname: string; text: string };

/** The 20-second checklist before speaking. Everything it confirms is true at this moment. */
function Prepare({ study, texts, resumable, onStart, onResume }: { study: Study; texts: Texts | null; resumable: boolean; onStart: () => void; onResume: () => void }) {
  const { t: tr } = useT();
  const t = paper;
  const s = themed(t, false);
  const checks = [
    { id: 'text', on: Boolean(texts), label: tr('checkText') },
    { id: 'screen', on: true, label: tr('checkAwake') },
    { id: 'steps', on: isReadyForPulpit(study), label: tr('checkSteps', { n: study.steps.length }) },
  ];
  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.prepare} testID="prepare">
        <Text style={s.label}>{tr('prepare')}</Text>
        <Text style={s.title}>{study.title}</Text>
        {checks.map((check) => (
          <Text key={check.id} testID={`check-${check.id}`} style={s.notes}>{check.on ? '✓' : '…'} {check.label}</Text>
        ))}
        <Text style={s.pace}>{tr('dndReminder')}</Text>
        {resumable ? (
          <Pressable testID="resume-session" style={[s.nav, s.navMain]} onPress={onResume}>
            <Text style={[s.navText, s.navTextMain]}>{tr('resumeSession')}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="start" disabled={!texts} style={[s.nav, !resumable && s.navMain, !texts && s.off]} onPress={onStart}>
          <Text style={[s.navText, !resumable && s.navTextMain]}>{tr(resumable ? 'startOver' : 'startNow')}</Text>
        </Pressable>
        <Pressable testID="prepare-exit" style={s.tool} onPress={() => goBack()}><Text style={s.toolText}>{tr('exit')}</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/** What happened against what was planned, kept with the content. */
function After({ run, onDone }: { run: PulpitRun; onDone: (place: string, note: string) => void }) {
  const { t: tr } = useT();
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const s = themed(paper, false);
  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.prepare} testID="after">
        <Text style={s.label}>{tr('afterTitle')}</Text>
        <Text style={s.title}>{run.title}</Text>
        <Text testID="after-summary" style={s.notes}>
          {tr('runSummary', { real: Math.round((run.endedAt - run.startedAt) / 60_000), planned: Math.round(run.plannedMs / 60_000) })}
        </Text>
        <TextInput testID="after-place" style={s.input} value={place} onChangeText={setPlace} placeholder={tr('placeLabel')} placeholderTextColor={paper.muted} />
        <TextInput testID="after-note" style={[s.input, s.inputLong]} multiline value={note} onChangeText={setNote} placeholder={tr('noteLabel')} placeholderTextColor={paper.muted} />
        <Pressable testID="after-save" style={[s.nav, s.navMain]} onPress={() => onDone(place.trim(), note.trim())}>
          <Text style={[s.navText, s.navTextMain]}>{tr('saveAndExit')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Pulpit() {
  const { id = 'demo' } = useLocalSearchParams<{ id?: string }>();
  const { t: tr, locale } = useT();
  const reader = useReader();
  const { studies, sessions, liveCodes } = reader;
  const study = useMemo(
    () => (id === 'demo' ? demoStudy(locale) : studies.find((s) => s.id === id && !s.deletedAt)),
    [id, locale, studies],
  );
  const code = liveCodes[id];
  const [texts, setTexts] = useState<Texts | null>(null);
  const [session, setSession] = useState<PulpitSession | null>(null);
  const [finished, setFinished] = useState<PulpitRun | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [dark, setDark] = useState(true);
  const [detail, setDetail] = useState<StepDetail>('manuscript');
  const [contextOpen, setContextOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const allowed = id === 'demo' || isPro(reader);
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const t = dark ? stage : paper;
  const s = themed(t, wide);

  useEffect(() => {
    if (!allowed) router.replace('/paywall?feature=pulpit');
  }, [allowed]);

  useEffect(() => {
    if (!study) return;
    let live = true;
    renderStudy(study, locale).then((rendered) => live && setTexts(rendered), () => {});
    return () => {
      live = false;
    };
    // The text only changes between sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locale]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    activateKeepAwakeAsync('pulpit').catch(() => {});
    return () => {
      clearInterval(timer);
      deactivateKeepAwake('pulpit').catch(() => {});
    };
  }, []);

  const change = useCallback(
    (next: (current: PulpitSession) => PulpitSession) => {
      setSession((current) => {
        if (!current) return current;
        const updated = next(current);
        saveSession(id, updated);
        return updated;
      });
    },
    [id],
  );

  const move = useCallback((delta: number) => change((c) => goTo(c, c.currentIndex + delta, Date.now())), [change]);

  const index = session?.currentIndex ?? 0;

  useEffect(() => {
    if (code && session) pushStep(code, index);
  }, [code, index, session === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepId = study?.steps[index]?.id;
  useEffect(() => {
    if (!liveOpen || !code || !stepId) return;
    const load = () =>
      apiFetch(`/live/${code}/answers?step=${encodeURIComponent(stepId)}`)
        .then((response) => (response.ok ? response.json() : []))
        .then(setAnswers)
        .catch(() => {});
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [liveOpen, code, stepId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !session) return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); move(1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); move(-1); }
      if (e.key.toLowerCase() === 't') setContextOpen((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, session === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!study || !isReadyForPulpit(study) || !allowed) return null;

  const begin = (resumed?: PulpitSession) => {
    const next = resumed ?? startSession(pulpitSections(study), Date.now());
    setSession(next);
    saveSession(id, next);
  };

  if (finished) {
    return (
      <After
        run={finished}
        onDone={(place, note) => {
          if (id !== 'demo') {
            const run = { ...finished, updatedAt: Date.now(), ...(place ? { place } : {}), ...(note ? { note } : {}) };
            updateReader({ runs: [run, ...getReader().runs] });
            router.dismissTo(`/study/${id}`);
          } else {
            goBack();
          }
        }}
      />
    );
  }

  if (!session) {
    const saved = sessions[id];
    return <Prepare study={study} texts={texts} resumable={Boolean(saved)} onStart={() => begin()} onResume={() => begin(saved)} />;
  }

  const finish = () => {
    const at = Date.now();
    setFinished({
      id: newId(), studyId: id, title: study.title, startedAt: at - (totalPlanned(session) - remaining(session, at)), endedAt: at,
      plannedMs: totalPlanned(session), spentMs: study.steps.map((_, i) => spentInSection(session, i, at)),
    });
    saveSession(id, null);
  };

  const highlight = (answerId: string | null) =>
    code && apiFetch(`/live/${code}/highlight`, { method: 'POST', body: JSON.stringify({ answerId }) }).catch(() => {});

  const currentPace = pace(session);
  const paceText =
    currentPace.kind === 'onPace' ? tr('onPace') : tr(currentPace.kind, { time: clock(currentPace.ms) });
  const step = study.steps[index]!;
  const next = study.steps[index + 1];
  const base = texts?.steps[index];
  const context = texts?.context;
  const state = timerState(session, now);
  const timeColor = state === 'over' ? t.over : state === 'warning' ? t.warn : t.fg;
  const detailKey = { manuscript: 'manuscript', outline: 'outlineLevel', keywords: 'keywordsLevel' } as const;
  const nextDetail = { manuscript: 'outline', outline: 'keywords', keywords: 'manuscript' } as const;
  const contextBody = (
    <ScrollView contentContainerStyle={s.contextBody}>
      <Text style={s.label}>{context?.label}</Text>
      <Text style={s.contextText}>{context?.body}</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.page}>
      <View style={s.top}>
        <Pressable testID="exit" style={s.tool} onPress={finish}><Text style={s.toolText}>{tr('finish')}</Text></Pressable>
        <View style={s.timerBox}>
          <Text testID="timer" style={[s.timer, { color: timeColor }]}>{clock(remaining(session, now))}</Text>
          <Text testID="pace" style={s.pace}>
            {paceText} · {tr('inStep', { time: clock(spentInSection(session, index, now)) })}
          </Text>
        </View>
        <Pressable
          testID="pause"
          style={s.tool}
          onPress={() => change((c) => (isPaused(c) ? resume(c, Date.now()) : pause(c, Date.now())))}>
          <Text style={s.toolText}>{tr(isPaused(session) ? 'resume' : 'pause')}</Text>
        </Pressable>
      </View>

      <View style={s.flow} testID="flow">
        {study.steps.map((item, i) => (
          <View key={item.id} style={s.flowItem}>
            {i > 0 ? <View style={[s.link, i <= index && s.linkDone]} /> : null}
            <Pressable
              testID={`node-${i}`}
              onPress={() => change((c) => goTo(c, i, Date.now()))}
              style={[s.node, i < index && s.nodeDone, i === index && s.nodeNow]}>
              <Text style={[s.nodeText, i === index && s.nodeTextNow]}>{i + 1}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={s.body}>
        <ScrollView style={s.main} contentContainerStyle={s.mainInner}>
          <Text style={s.label}>{tr('stepOf', { i: index + 1, n: study.steps.length })}</Text>
          <Text testID="step-title" style={s.title}>{step.title}</Text>
          <View style={s.base}>
            {base?.label ? <Text style={s.label}>{base.label}</Text> : null}
            <Text testID="base-text" style={s.baseText}>{base?.body}</Text>
          </View>
          <Text testID="notes" style={detail === 'keywords' ? s.keywords : s.notes}>{stepBody(step, detail)}</Text>
          {step.expectedAnswer ? <Text testID="expected" style={s.pace}>{tr('expectedAnswer')}: {step.expectedAnswer}</Text> : null}
          {next ? <Text style={s.nextHint}>{tr('upNext', { title: next.title })}</Text> : null}
        </ScrollView>
        {wide && contextOpen ? <View testID="context-pane" style={s.pane}>{contextBody}</View> : null}
      </View>

      <View style={s.bottom}>
        <Pressable testID="prev" disabled={index === 0} style={[s.nav, index === 0 && s.off]} onPress={() => move(-1)}>
          <Text style={s.navText}>{tr('previous')}</Text>
        </Pressable>
        <Pressable testID="context" style={s.tool} onPress={() => setContextOpen((o) => !o)}>
          <Text style={s.toolText}>{tr('context')}</Text>
        </Pressable>
        <Pressable testID="detail" style={s.tool} onPress={() => setDetail(nextDetail[detail])}>
          <Text style={s.toolText}>{tr(detailKey[detail])}</Text>
        </Pressable>
        {code ? (
          <Pressable testID="live" style={s.tool} onPress={() => setLiveOpen(true)}>
            <Text style={s.toolText}>{tr('liveNow')}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="theme" style={s.tool} onPress={() => setDark((d) => !d)}>
          <Text style={s.toolText}>{tr(dark ? 'light' : 'stage')}</Text>
        </Pressable>
        <Pressable
          testID="next"
          disabled={!next}
          style={[s.nav, s.navMain, !next && s.off]}
          onPress={() => move(1)}>
          <Text style={[s.navText, s.navTextMain]}>{tr('next')}</Text>
        </Pressable>
      </View>

      <Modal visible={liveOpen} transparent animationType="slide" onRequestClose={() => setLiveOpen(false)}>
        <View style={s.sheetBackdrop}>
          <View testID="live-sheet" style={s.sheet}>
            <Pressable testID="live-close" style={s.tool} onPress={() => setLiveOpen(false)}><Text style={s.toolText}>{tr('close')}</Text></Pressable>
            <ScrollView contentContainerStyle={s.contextBody}>
              {code ? <Qr value={classLink(code)} size={160} /> : null}
              <Text style={s.label}>{code} · {code ? screenLink(code) : ''}</Text>
              {step.question ? <Text style={s.notes}>{step.question}</Text> : null}
              {answers.map((answer) => (
                <Pressable key={answer.id} testID="answer" style={s.answer} onPress={() => highlight(answer.id)}>
                  <Text style={s.toolText}>{answer.text}</Text>
                  <Text style={s.pace}>{answer.nickname || tr('anonymous')} · {tr('showOnScreen')}</Text>
                </Pressable>
              ))}
              <Pressable testID="clear-highlight" style={s.tool} onPress={() => highlight(null)}><Text style={s.toolText}>{tr('clearScreen')}</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!wide && contextOpen} transparent animationType="slide" onRequestClose={() => setContextOpen(false)}>
        <View style={s.sheetBackdrop}>
          <View testID="context-sheet" style={s.sheet}>
            <Pressable style={s.tool} onPress={() => setContextOpen(false)}><Text style={s.toolText}>{tr('close')}</Text></Pressable>
            {contextBody}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const themed = (t: Theme, wide: boolean) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: t.bg },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    timerBox: { alignItems: 'center', flex: 1 },
    timer: { fontSize: wide ? 44 : 36, fontFamily: sansSemi, fontVariant: ['tabular-nums'] },
    pace: { fontFamily: sans, fontSize: 13, color: t.muted, textAlign: 'center' },
    tool: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: t.line, backgroundColor: t.soft, alignSelf: 'flex-start' },
    toolText: { fontFamily: sans, fontSize: 15, color: t.fg },
    flow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.line },
    flowItem: { flexDirection: 'row', alignItems: 'center' },
    link: { width: wide ? 56 : 24, height: 2, backgroundColor: t.line },
    linkDone: { backgroundColor: t.accent },
    node: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.line },
    nodeDone: { backgroundColor: t.soft, borderColor: t.accent },
    nodeNow: { backgroundColor: t.accent, borderColor: t.accent },
    nodeText: { fontFamily: sans, fontSize: 15, color: t.fg, fontVariant: ['tabular-nums'] },
    nodeTextNow: { color: t.accentFg, fontFamily: sansBold },
    body: { flex: 1, flexDirection: 'row' },
    main: { flex: 1 },
    mainInner: { padding: wide ? 32 : 20, gap: 16, maxWidth: 860, width: '100%', alignSelf: 'center' },
    label: { fontSize: 13, fontFamily: sansSemi, letterSpacing: 1, textTransform: 'uppercase', color: t.muted },
    title: { fontFamily: sansBold, fontSize: wide ? 40 : 30, lineHeight: wide ? 46 : 36, color: t.fg },
    base: { gap: 8, paddingLeft: 16, borderLeftWidth: 5, borderLeftColor: t.mark },
    baseText: { fontFamily: serif, fontSize: wide ? 34 : 26, lineHeight: wide ? 46 : 36, color: t.fg },
    notes: { fontFamily: sans, fontSize: wide ? 24 : 20, lineHeight: wide ? 34 : 29, color: t.fg },
    nextHint: { fontFamily: sans, fontSize: 15, color: t.muted },
    pane: { width: '36%', borderLeftWidth: 1, borderLeftColor: t.line },
    contextBody: { padding: 20, gap: 10 },
    contextText: { fontFamily: serif, fontSize: 21, lineHeight: 31, color: t.fg },
    bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.line },
    nav: { flexGrow: 1, flexBasis: wide ? 160 : '40%', paddingHorizontal: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: t.line, backgroundColor: t.soft },
    navMain: { backgroundColor: t.accent, borderColor: t.accent },
    navText: { fontSize: 18, fontFamily: sansSemi, color: t.fg },
    navTextMain: { color: t.accentFg },
    off: { opacity: 0.4 },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    keywords: { fontSize: wide ? 44 : 34, lineHeight: wide ? 54 : 42, fontFamily: sansSemi, color: t.fg },
    prepare: { padding: 24, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
    input: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.soft, fontFamily: sans, fontSize: 16, color: t.fg },
    inputLong: { minHeight: 110, textAlignVertical: 'top' },
    answer: { gap: 4, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.line },
    sheet: { height: '72%', padding: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: t.bg },
  });

import {
  ACTIVITY_DEFAULT_MINUTES, blockBody, goTo, hasBaseText, isPaused, isReadyForPulpit, stepsMissingBaseText, pace, pause, pulpitSections, remaining, resume, spentInSection,
  startSession, passageText, timerState, totalPlanned, visibleBlocks,
  type PulpitRun, type PulpitSession, type StepDetail, type Study,
} from '@preachfy/core';
import { Icon } from '@/components/Icon';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Qr } from '@/components/Qr';
import type { IconName } from '@/components/ui';
import { apiFetch } from '@/lib/auth';
import { blockColor, blockKey, stepName } from '@/lib/blocks';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { backgrounds, classLink, openLive, pushHighlight, pushScreen, pushStep, screenLink } from '@/lib/live';
import { resolvePassage } from '@/lib/passage';
import { goBack } from '@/lib/navigation';
import { canRecord, useSermonRecorder } from '@/lib/recording';
import { demoStudy } from '@/lib/sample';
import { getReader, isPro, updateReader, useReader } from '@/lib/store';
import { renderStudy, renderText, type Rendered } from '@/lib/studyText';
import { paper, serif, serifBold, stage, type Theme } from '@/lib/theme';

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

type RoundProps = { icon: IconName; label: string; onPress: () => void; onLongPress?: () => void; t: Theme; testID: string; big?: boolean; disabled?: boolean; active?: boolean };

/** Round controls leave the screen to the text, and stay easy to hit with a thumb. */
function Round({ icon, label, onPress, onLongPress, t, testID, big, disabled, active }: RoundProps) {
  const size = big ? 54 : 44;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? t.accent : t.soft, opacity: disabled ? 0.4 : 1 }}
      delayLongPress={800}
      onLongPress={onLongPress}
      onPress={onPress}>
      <Icon name={icon} size={big ? 26 : 22} color={active ? t.accentFg : t.fg} />
    </Pressable>
  );
}

/** A countdown the group can see while it works. It restarts for each activity. */
function ActivityTimer({ minutes, t, s }: { minutes: number; t: Theme; s: ReturnType<typeof themed> }) {
  const { t: tr } = useT();
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);
  const label = left === 0 ? tr('resetTimer') : running ? tr('pauseTimer') : tr('startTimer');
  return (
    <View style={s.activity}>
      <Text testID="activity-clock" style={[s.activityClock, left === 0 && { color: t.over }]}>{clock(left * 1000)}</Text>
      <Pressable testID="activity-toggle" accessibilityRole="button" style={s.tool} onPress={() => (left === 0 ? (setLeft(minutes * 60), setRunning(false)) : setRunning(!running))}>
        <Text style={s.toolText}>{label}</Text>
      </Pressable>
    </View>
  );
}

/** The 20-second checklist before speaking. Everything it confirms is true at this moment. */
function Prepare({ study, texts, resumable, onStart, onResume }: { study: Study; texts: Texts | null; resumable: boolean; onStart: () => void; onResume: () => void }) {
  const { t: tr } = useT();
  const t = stage;
  const s = themed(t, false);
  const missing = stepsMissingBaseText(study).length;
  const checks = [
    { id: 'text', on: Boolean(texts), label: tr('checkText') },
    { id: 'screen', on: true, label: tr('checkAwake') },
    { id: 'steps', on: missing === 0, label: missing === 0 ? tr('checkSteps', { n: study.steps.length }) : tr('checkStepsMissing', { n: missing }) },
  ];
  return (
    <SafeAreaView style={s.page}>
      <ScrollView contentContainerStyle={s.prepareBody} testID="prepare">
        <Text style={s.label}>{tr('prepare')}</Text>
        <Text style={s.prepareTitle}>{study.title}</Text>
        <View style={s.checks}>
          {checks.map((check) => (
            <View key={check.id} style={s.checkRow}>
              <View style={[s.checkDot, check.on && s.checkDotOn]} testID={`check-${check.id}`}>
                {check.on ? <Icon name="check" size={14} color={t.accentFg} /> : null}
              </View>
              <Text style={s.checkText}>{check.label}</Text>
            </View>
          ))}
        </View>
        <Text style={s.prepareHint}>{tr('dndReminder')}</Text>
      </ScrollView>
      <View style={s.prepareActions}>
        {resumable ? (
          <Pressable testID="resume-session" style={[s.nav, s.navMain]} onPress={onResume}>
            <Text style={[s.navText, s.navTextMain]}>{tr('resumeSession')}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="start" disabled={!texts} style={[s.nav, !resumable && s.navMain, !texts && s.off]} onPress={onStart}>
          <Text style={[s.navText, !resumable && s.navTextMain]}>{tr(resumable ? 'startOver' : 'startNow')}</Text>
        </Pressable>
        <Pressable testID="prepare-exit" style={s.exitLink} onPress={() => goBack()}><Text style={s.toolText}>{tr('exit')}</Text></Pressable>
      </View>
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
  const { id = 'demo', autostart, block } = useLocalSearchParams<{ id?: string; autostart?: string; block?: string }>();
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
  const [blockIndex, setBlockIndex] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [locked, setLocked] = useState(false);
  const [screen, setScreen] = useState({ blank: false, background: 'none', dim: 60 });
  const [detourOpen, setDetourOpen] = useState(false);
  const [detourQuery, setDetourQuery] = useState('');
  const [detour, setDetour] = useState<Rendered | null>(null);
  const [detourFailed, setDetourFailed] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [fit, setFit] = useState(1);
  const [settled, setSettled] = useState(false);
  const [viewH, setViewH] = useState(0);
  const search = useRef({ lo: 0.35, hi: 1.6, f: 1, n: 0, h: 0 });
  const allowed = id === 'demo' || isPro(reader);
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const t = dark ? stage : paper;
  const scale = zoom ?? fit;
  const s = themed(t, wide, scale);

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

  // Development shortcut: `?autostart=1&block=2` opens the Pulpit already running.
  useEffect(() => {
    if (!__DEV__ || !autostart || session || !texts || !study || study.steps.length === 0) return;
    const started = startSession(pulpitSections(study), Date.now());
    setSession(started);
    saveSession(id, started);
    if (block) setBlockIndex(Number(block) || 0);
  }, [autostart, block, session, texts, study, id]);

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

  /** The base text first, then each block that has something in it. */
  const lengthOf = (i: number) => {
    const at = study?.steps[i];
    return at ? Math.max(1, Number(hasBaseText(at)) + visibleBlocks(at).length) : 1;
  };
  const advance = (direction: 1 | -1) => {
    if (direction === 1) {
      if (blockIndex < lengthOf(index) - 1) setBlockIndex(blockIndex + 1);
      else if (study && index < study.steps.length - 1) {
        move(1);
        setBlockIndex(0);
      }
    } else if (blockIndex > 0) setBlockIndex(blockIndex - 1);
    else if (index > 0) {
      move(-1);
      setBlockIndex(lengthOf(index - 1) - 1);
    }
  };
  const recording = useSermonRecorder(index, session ? isPaused(session) : false);

  // The text is sized to fill the screen without scrolling. The reader can then make it bigger or smaller.
  useEffect(() => {
    search.current = { lo: 0.35, hi: 1.6, f: 1, n: 0, h: search.current.h };
    setFit(1);
    setSettled(false);
  }, [index, blockIndex, detail, viewH, wide]);
  const evaluate = useCallback(
    (h: number) => {
      const r = search.current;
      r.h = h;
      if (!viewH || h === 0) return;
      if (h > viewH + 1) r.hi = r.f;
      else r.lo = r.f;
      if (r.hi - r.lo > 0.04 && r.n < 10) {
        r.n += 1;
        r.f = (r.lo + r.hi) / 2;
      } else {
        r.f = r.lo;
        setSettled(true);
      }
      setFit(r.f);
    },
    [viewH],
  );
  useEffect(() => {
    if (settled || zoom !== null) return;
    const timer = setTimeout(() => evaluate(search.current.h), 160);
    return () => clearTimeout(timer);
  }, [fit, settled, zoom, evaluate, index, blockIndex, detail]);

  const changeScreen = useCallback(
    (next: (current: typeof screen) => typeof screen) => {
      setScreen((current) => {
        const updated = next(current);
        if (code) pushScreen(code, updated);
        return updated;
      });
    },
    [code],
  );

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); advance(1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); advance(-1); }
      const key = e.key.toLowerCase();
      if (key === 't') setContextOpen((open) => !open);
      if (key === 'v') setDetourOpen(true);
      if (key === 'l') setLocked((on) => !on);
      if (key === 'b') changeScreen((current) => ({ ...current, blank: !current.blank }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, session === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!study || !allowed) return null;
  // Nothing to lead yet, so say it plainly instead of showing an empty screen.
  if (study.steps.length === 0) {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.prepareBody} testID="pulpit-empty">
          <Text style={s.prepareTitle}>{study.title}</Text>
          <Text style={s.prepareHint}>{tr('noStepsYet')}</Text>
        </View>
        <View style={s.prepareActions}>
          <Pressable testID="empty-back" style={[s.nav, s.navMain]} onPress={() => goBack()}><Text style={[s.navText, s.navTextMain]}>{tr('back')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

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

  const finish = async () => {
    const at = Date.now();
    const runId = newId();
    const audio = await recording.stop(runId).catch(() => undefined);
    setFinished({
      id: runId, studyId: id, ...(audio ? { audio } : {}), title: study.title, startedAt: at - (totalPlanned(session) - remaining(session, at)), endedAt: at,
      plannedMs: totalPlanned(session), spentMs: study.steps.map((_, i) => spentInSection(session, i, at)),
    });
    saveSession(id, null);
  };

  const highlight = (answerId: string | null) => {
    if (code) pushHighlight(code, answerId ? { answerId } : {});
  };

  const findDetour = async () => {
    const passage = await resolvePassage(detourQuery, locale, study.passage?.translationId ?? reader.translation);
    setDetourFailed(!passage);
    setDetour(passage ? await renderText(passageText(passage), locale) : null);
  };

  const closeDetour = () => {
    setDetourOpen(false);
    setDetour(null);
    setDetourQuery('');
    setDetourFailed(false);
    if (code) pushHighlight(code, {});
  };

  const openScreen = () => {
    if (id !== 'demo') openLive(study, locale).catch(() => setToast(tr('screenFailed')));
  };

  const currentPace = pace(session);
  const paceText =
    currentPace.kind === 'onPace' ? tr('onPace') : tr(currentPace.kind, { time: clock(currentPace.ms) });
  const step = study.steps[index]!;
  const next = study.steps[index + 1];
  const base = texts?.steps[index];
  const hasBase = hasBaseText(step);
  const blocks = visibleBlocks(step);
  const total = Number(hasBase) + blocks.length;
  const position = Math.min(blockIndex, Math.max(total - 1, 0));
  const showingBase = hasBase && position === 0;
  const current = showingBase ? null : (blocks[position - Number(hasBase)] ?? null);
  const hasMore = position < total - 1 || Boolean(next);
  const accent = blockColor(current?.kind ?? 'scripture', dark);
  const isClass = study.kind === 'class';
  const context = texts?.context;
  const state = timerState(session, now);
  const timeColor = state === 'over' ? t.over : state === 'warning' ? t.warn : t.fg;
  const detailKey = { manuscript: 'detailFull', outline: 'outlineLevel', keywords: 'keywordsLevel' } as const;
  const sizes = [0.8, 1, 1.25, 1.6, 2];
  const smaller = () => setZoom([...sizes].reverse().find((x) => x < scale - 0.01) ?? sizes[0]!);
  const bigger = () => setZoom(sizes.find((x) => x > scale + 0.01) ?? sizes[sizes.length - 1]!);
  const nameOf = (i: number) => {
    const at = study.steps[i];
    return at ? stepName(at, texts?.steps[i]?.label ?? '') || tr('stepN', { i: i + 1 }) : '';
  };
  const jump = (i: number) => {
    change((c) => goTo(c, i, Date.now()));
    setBlockIndex(0);
  };
  const tools = (
    <>
      <Round testID="context" icon="book" label={tr('context')} t={t} onPress={() => setContextOpen((o) => !o)} />
      <Round testID="detail" icon="text-size" label={tr('display')} t={t} active={displayOpen} onPress={() => setDisplayOpen((o) => !o)} />
      {canRecord && id !== 'demo' ? (
        <Round testID="record" icon="mic" label={tr('record')} t={t} active={recording.active} onPress={() => (recording.active ? setToast(`● ${tr('record')}`) : recording.start().catch(() => setToast(tr('micDenied'))))} />
      ) : null}
      <Round testID="detour" icon="verse" label={tr('verseOutside')} t={t} onPress={() => setDetourOpen(true)} />
      {id !== 'demo' ? <Round testID="live" icon="tv" label={tr('screenSheet')} t={t} onPress={() => setLiveOpen(true)} /> : null}
      <Round testID="theme" icon={dark ? 'sun' : 'moon'} label={tr(dark ? 'light' : 'stage')} t={t} onPress={() => setDark((d) => !d)} />
    </>
  );
  const contextBody = (
    <ScrollView contentContainerStyle={s.contextBody}>
      {context?.body ? <Text style={s.label}>{context.label}</Text> : null}
      <Text style={s.contextText}>{context?.body || tr('noPassageText')}</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.page}>
      <View style={s.top}>
        {locked ? <View style={s.roundSpace} /> : <Round testID="exit" icon="close" label={tr('finish')} t={t} onPress={finish} />}
        <View style={s.timerBox}>
          <Text testID="timer" style={[s.timer, { color: timeColor }]}>{clock(remaining(session, now))}</Text>
          <Text testID="pace" style={s.pace}>
            {paceText} · {tr('inStep', { time: clock(spentInSection(session, index, now)) })}
            {recording.active ? ` · ● ${clock(recording.elapsed)}` : ''}
            {recording.denied ? ` · ${tr('micDenied')}` : ''}
          </Text>
          {toast ? <Text testID="toast" style={s.pace} onPress={() => setToast('')}>{toast}</Text> : null}
        </View>
        {locked ? <View style={s.roundSpace} /> : <Round
          testID="pause"
          icon={isPaused(session) ? 'play' : 'pause'}
          label={tr(isPaused(session) ? 'resume' : 'pause')}
          t={t}
          onPress={() => change((c) => (isPaused(c) ? resume(c, Date.now()) : pause(c, Date.now())))}
        />}
      </View>

      <View style={s.timeBar} testID="time-bar">
        {study.steps.map((item, i) => {
          const part = Math.min(spentInSection(session, i, now) / Math.max(item.plannedMs, 1), 1);
          return (
            <View key={item.id} style={[s.timeSegment, { flex: Math.max(item.plannedMs, 1) }, i === index && s.timeNow]}>
              <View style={[s.timeFill, { width: `${part * 100}%` }]} />
            </View>
          );
        })}
      </View>

      <View style={s.journey} testID="flow">
        <Pressable testID="journey-prev" style={[s.jSide, { alignItems: 'flex-start' }]} onPress={() => index > 0 && jump(index - 1)}>
          {index > 0 ? (
            <>
              <Text style={s.jTag}>← {tr('before')}</Text>
              <Text style={s.jName} numberOfLines={2}>{nameOf(index - 1)}</Text>
            </>
          ) : null}
        </Pressable>
        <View style={s.jNow}>
          <Text style={s.jTag}>{tr('stepOf', { i: index + 1, n: study.steps.length })}</Text>
          <Text testID="step-title" style={s.jNowName} numberOfLines={2}>{nameOf(index)}</Text>
        </View>
        <Pressable testID="journey-next" style={[s.jSide, { alignItems: 'flex-end' }]} onPress={() => next && jump(index + 1)}>
          {next ? (
            <>
              <Text style={s.jTag}>{tr('after')} →</Text>
              <Text style={[s.jName, { textAlign: 'right' }]} numberOfLines={2}>{nameOf(index + 1)}</Text>
            </>
          ) : null}
        </Pressable>
      </View>
      <View style={s.dots}>
        {study.steps.map((item, i) => (
          <Pressable key={item.id} testID={`node-${i}`} hitSlop={10} accessibilityLabel={nameOf(i)} onPress={() => jump(i)} style={[s.dot, i < index && s.dotDone, i === index && s.dotNow]} />
        ))}
      </View>

      {/* The verse map earns its place only in a long passage; a short one is already clear from the rail. */}
      {study.passage && study.passage.to - study.passage.from >= 8 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mapBar} contentContainerStyle={s.map} testID="verse-map">
          {Array.from({ length: study.passage.to - study.passage.from + 1 }, (_, i) => study.passage!.from + i).map((verse) => {
            const inStep = step.baseText?.kind === 'scripture' && step.baseText.spans.some((x) => x.ref.verse === verse);
            return (
              <Pressable key={verse} testID={`map-${verse}`} style={[s.chip, inStep && s.chipOn]} onPress={() => setContextOpen(true)}>
                <Text style={[s.chipText, inStep && s.chipTextOn]}>{verse}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={s.body}>
        <Pressable testID="zone-prev" accessibilityLabel={tr('previous')} style={[s.zone, s.zoneLeft]} onPress={() => advance(-1)} />
        <Pressable testID="zone-next" accessibilityLabel={tr('next')} style={[s.zone, s.zoneRight]} onPress={() => advance(1)} />
        <View style={s.main}>
          <View style={s.railWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.railBar} contentContainerStyle={s.rail} testID="block-rail">
              {[...(hasBase ? [{ kind: 'scripture' as const, id: 'base' }] : []), ...blocks].map((item, i) => (
                <Pressable key={item.id} testID={`rail-${i}`} accessibilityRole="button" style={[s.railChip, i < position && s.railDone, i === position && s.railNow]} onPress={() => setBlockIndex(i)}>
                  <Text style={[s.railText, i === position && s.railTextNow]}>{tr(blockKey[item.kind])}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <ScrollView
            style={[s.fitView, { opacity: settled || zoom !== null ? 1 : 0 }]}
            contentContainerStyle={s.mainInner}
            onLayout={(e) => setViewH(Math.round(e.nativeEvent.layout.height))}
            onContentSizeChange={(_w, h) => evaluate(h)}>
            <View style={[s.base, { borderLeftColor: accent }]} testID="block-card">
              {total === 0 ? (
                <Text testID="step-empty" style={s.blockText}>{tr('stepEmpty')}</Text>
              ) : showingBase ? (
                <>
                  {base?.label ? <Text style={s.label}>{base.label}</Text> : null}
                  <Text testID="base-text" style={s.baseText}>{base?.body}</Text>
                </>
              ) : current ? (
                <>
                  <Text style={s.label}>{tr(blockKey[current.kind])}</Text>
                  {current.kind !== 'activity' || current.text ? (
                    <Text testID="block-text" style={current.kind === 'idea' && detail === 'keywords' ? s.keywords : s.blockText}>{blockBody(current, detail)}</Text>
                  ) : null}
                  {current.kind === 'activity' ? <ActivityTimer key={current.id} minutes={current.minutes ?? ACTIVITY_DEFAULT_MINUTES} t={t} s={s} /> : null}
                  {current.kind === 'question' && current.expectedAnswer ? <Text testID="expected" style={s.expected}>{tr('expectedAnswer')}: {current.expectedAnswer}</Text> : null}
                </>
              ) : null}
            </View>
          </ScrollView>
          {next ? (
            <Pressable style={s.bridgeRow} testID="bridge" onPress={() => jump(index + 1)}>
              <View style={s.bridgeLine} />
              <Text style={s.bridgeText} numberOfLines={2}>{step.bridge ? `“${step.bridge}”` : `${tr('bridgeNext')} · ${nameOf(index + 1)}`}</Text>
              <Icon name="chevron-forward" size={16} color={t.muted} />
            </Pressable>
          ) : null}
        </View>
        {wide && contextOpen ? <View testID="context-pane" style={s.pane}>{contextBody}</View> : null}
      </View>

      {displayOpen && !locked ? (
        <View style={s.displayPanel} testID="display-panel">
          <View style={s.tools}>
            <Pressable testID="size-down" accessibilityLabel={tr('sizeSmaller')} style={s.tool} onPress={smaller}><Text style={s.toolText}>A−</Text></Pressable>
            <Pressable testID="size-auto" accessibilityLabel={tr('sizeAuto')} style={[s.tool, zoom === null && s.toolOn]} onPress={() => setZoom(null)}><Text style={[s.toolText, zoom === null && s.toolTextOn]}>{tr('sizeAuto')}</Text></Pressable>
            <Pressable testID="size-up" accessibilityLabel={tr('sizeBigger')} style={s.tool} onPress={bigger}><Text style={s.toolText}>A+</Text></Pressable>
          </View>
          <View style={s.tools}>
            {(['manuscript', 'outline', 'keywords'] as const).map((level) => (
              <Pressable key={level} testID={`detail-${level}`} style={[s.tool, detail === level && s.toolOn]} onPress={() => setDetail(level)}>
                <Text style={[s.toolText, detail === level && s.toolTextOn]}>{tr(detailKey[level])}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.pace}>{tr('detailHint')}</Text>
        </View>
      ) : null}
      {!wide && !locked ? <View style={s.toolsRow}>{tools}</View> : null}
      <View style={s.bottom}>
        <Round testID="prev" big icon="chevron-back" label={tr('previous')} t={t} disabled={index === 0 && blockIndex === 0} onPress={() => advance(-1)} />
        {locked ? <Text testID="locked" style={s.lockedText}>{tr('lockedHint')}</Text> : wide ? tools : null}
        <Round testID="lock" icon="lock" label={tr('lockScreen')} t={t} onPress={() => !locked && setLocked(true)} onLongPress={() => setLocked(false)} />
        <Pressable testID="next" accessibilityRole="button" style={[s.nav, s.navMain]} onPress={() => (hasMore ? advance(1) : finish())}>
          <Text style={[s.navText, s.navTextMain]} numberOfLines={1}>{!hasMore ? tr('finish') : position < total - 1 ? tr('nextBlock') : tr('nextStepGo')}</Text>
        </Pressable>
      </View>

      <Modal visible={detourOpen} transparent animationType="slide" onRequestClose={closeDetour}>
        <View style={s.sheetBackdrop}>
          <View testID="detour-sheet" style={s.sheet}>
            <ScrollView contentContainerStyle={s.contextBody} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>{tr('detourHint')}</Text>
              <TextInput
                testID="detour-input"
                style={s.input}
                value={detourQuery}
                onChangeText={setDetourQuery}
                onSubmitEditing={findDetour}
                placeholder={tr('passageHint')}
                placeholderTextColor={t.muted}
                autoCorrect={false}
                returnKeyType="search"
              />
              {detourFailed ? <Text testID="detour-error" style={s.pace}>{tr('passageInvalid')}</Text> : null}
              {detour ? (
                <>
                  <Text testID="detour-ref" style={s.label}>{detour.label}</Text>
                  <Text testID="detour-text" style={s.contextText}>{detour.body}</Text>
                </>
              ) : null}
              <View style={s.tools}>
                <Pressable testID="detour-find" style={s.tool} onPress={findDetour}><Text style={s.toolText}>{tr('search')}</Text></Pressable>
                {detour && code ? (
                  <Pressable testID="detour-project" style={s.tool} onPress={() => pushHighlight(code, { text: `${detour.body}\n${detour.label}` })}>
                    <Text style={s.toolText}>{tr('projectThis')}</Text>
                  </Pressable>
                ) : null}
                <Pressable testID="detour-back" style={[s.tool, s.toolOn]} onPress={closeDetour}><Text style={[s.toolText, s.toolTextOn]}>{tr('backToStep')}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={liveOpen} transparent animationType="slide" onRequestClose={() => setLiveOpen(false)}>
        <View style={s.sheetBackdrop}>
          <View testID="live-sheet" style={s.sheet}>
            <Pressable testID="live-close" style={s.tool} onPress={() => setLiveOpen(false)}><Text style={s.toolText}>{tr('close')}</Text></Pressable>
            <ScrollView contentContainerStyle={s.contextBody}>
              {code ? (
                <>
                  <View style={[s.preview, { backgroundColor: screen.blank ? '#000000' : (backgrounds[screen.background] ?? '#000000') }]} testID="screen-preview">
                    {screen.background !== 'none' && !screen.blank ? <View style={[s.previewDim, { opacity: screen.dim / 100 }]} /> : null}
                    <Text style={s.previewText} numberOfLines={3}>{screen.blank ? '' : base?.body}</Text>
                  </View>
                  <View style={s.tools}>
                    <Pressable testID="screen-blank" style={[s.tool, screen.blank && s.toolOn]} onPress={() => changeScreen((c) => ({ ...c, blank: !c.blank }))}>
                      <Text style={[s.toolText, screen.blank && s.toolTextOn]}>{tr('blankScreen')}</Text>
                    </Pressable>
                    <Pressable testID="clear-highlight" style={s.tool} onPress={() => highlight(null)}><Text style={s.toolText}>{tr('clearScreen')}</Text></Pressable>
                  </View>
                  <View style={s.swatches}>
                    {Object.keys(backgrounds).map((key) => (
                      <Pressable
                        key={key}
                        testID={`screen-bg-${key}`}
                        accessibilityLabel={key}
                        style={[s.swatch, { backgroundColor: backgrounds[key] }, screen.background === key && s.swatchOn]}
                        onPress={() => changeScreen((c) => ({ ...c, background: key }))}
                      />
                    ))}
                    {[50, 70, 85].map((dim) => (
                      <Pressable key={dim} testID={`screen-dim-${dim}`} style={[s.tool, screen.dim === dim && s.toolOn]} onPress={() => changeScreen((c) => ({ ...c, dim }))}>
                        <Text style={[s.toolText, screen.dim === dim && s.toolTextOn]}>{dim}%</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Qr value={isClass ? classLink(code) : screenLink(code)} size={150} />
                  <Text style={s.label}>{isClass ? `${code} · ${classLink(code)}` : screenLink(code)}</Text>
                </>
              ) : (
                <Pressable testID="screen-open" style={[s.nav, s.navMain]} onPress={openScreen}>
                  <Text style={[s.navText, s.navTextMain]}>{tr(isClass ? 'shareClass' : 'openScreen')}</Text>
                </Pressable>
              )}
              {isClass && step.question ? <Text style={s.notes}>{step.question}</Text> : null}
              {(isClass ? answers : []).map((answer) => (
                <Pressable key={answer.id} testID="answer" style={s.answer} onPress={() => highlight(answer.id)}>
                  <Text style={s.toolText}>{answer.text}</Text>
                  <Text style={s.pace}>{answer.nickname || tr('anonymous')} · {tr('showOnScreen')}</Text>
                </Pressable>
              ))}
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

const themed = (t: Theme, wide: boolean, scale = 1) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: t.bg },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    timerBox: { alignItems: 'center', flex: 1 },
    timer: { fontSize: wide ? 44 : 36, fontWeight: '600', fontVariant: ['tabular-nums'] },
    pace: { fontSize: 12, color: t.muted, textAlign: 'center' },
    tool: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.soft, alignSelf: 'flex-start' },
    toolText: { fontSize: 15, fontWeight: '500', color: t.accent === paper.accent ? t.accent : t.fg },
    flow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    flowItem: { flexDirection: 'row', alignItems: 'center' },
    link: { width: wide ? 56 : 24, height: 2, backgroundColor: t.line },
    linkDone: { backgroundColor: t.accent },
    node: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.line },
    nodeDone: { backgroundColor: t.soft, borderColor: t.accent },
    nodeNow: { backgroundColor: t.accent, borderColor: t.accent },
    nodeText: { fontSize: 15, color: t.fg, fontVariant: ['tabular-nums'] },
    nodeTextNow: { color: t.accentFg, fontWeight: '700' },
    body: { flex: 1, flexDirection: 'row' },
    main: { flex: 1 },
    fitView: { flex: 1 },
    railWrap: { paddingHorizontal: wide ? 32 : 20, paddingTop: 12, maxWidth: 860, width: '100%', alignSelf: 'center' },
    mainInner: { paddingHorizontal: wide ? 32 : 20, paddingVertical: 14, gap: 16, maxWidth: 860, width: '100%', alignSelf: 'center' },
    journey: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
    jSide: { flex: 1, minHeight: 48, justifyContent: 'center', gap: 2 },
    jNow: { flex: 1.5, alignItems: 'center', gap: 2 },
    jTag: { fontSize: 11, fontWeight: '600', color: t.muted, letterSpacing: 0.3 },
    jName: { fontSize: 13, color: t.muted, opacity: 0.8 },
    jNowName: { fontFamily: serifBold, fontSize: wide ? 24 : 19, lineHeight: wide ? 28 : 23, color: t.fg, textAlign: 'center' },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.line },
    dotDone: { backgroundColor: t.muted },
    dotNow: { width: 26, backgroundColor: t.accent },
    bridgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: wide ? 32 : 20, paddingVertical: 10, maxWidth: 860, width: '100%', alignSelf: 'center' },
    bridgeLine: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t.accent, opacity: 0.6 },
    bridgeText: { flex: 1, fontFamily: serif, fontStyle: 'italic', fontSize: 16, lineHeight: 22, color: t.muted },
    displayPanel: { gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
    label: { fontSize: 13, fontWeight: '600', color: t.muted },
    title: { fontFamily: serifBold, fontSize: wide ? 42 : 32, lineHeight: wide ? 46 : 36, color: t.fg },
    base: { gap: 8, paddingLeft: 16, borderLeftWidth: 5, borderLeftColor: t.mark },
    baseText: { fontFamily: serif, fontSize: Math.round((wide ? 34 : 26) * scale), lineHeight: Math.round((wide ? 46 : 36) * scale), color: t.fg },
    notes: { fontSize: wide ? 24 : 20, lineHeight: wide ? 34 : 29, color: t.fg },
    nextHint: { fontSize: 15, color: t.muted },
    pane: { width: '36%', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.line },
    contextBody: { padding: 20, gap: 10 },
    contextText: { fontFamily: serif, fontSize: 21, lineHeight: 31, color: t.fg },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, ...(wide ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line } : {}) },
    nav: { flexGrow: 1, flexShrink: 1, minWidth: 96, paddingHorizontal: 12, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: t.soft },
    navMain: { backgroundColor: t.accent },
    navText: { fontSize: 17, fontWeight: '600', color: t.fg },
    navTextMain: { color: t.accentFg },
    off: { opacity: 0.4 },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    prepareBody: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
    prepareTitle: { fontFamily: serifBold, fontSize: 38, lineHeight: 42, letterSpacing: -0.5, color: t.fg },
    checks: { gap: 16, marginTop: 8 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    checkDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: t.line, alignItems: 'center', justifyContent: 'center' },
    checkDotOn: { backgroundColor: t.accent, borderColor: t.accent },
    checkText: { flex: 1, fontSize: 18, color: t.fg },
    prepareHint: { fontSize: 14, lineHeight: 20, color: t.muted },
    prepareActions: { gap: 10, paddingHorizontal: 20, paddingBottom: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
    exitLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    expected: { fontSize: 14, lineHeight: 20, color: t.muted },
    railBar: { flexGrow: 0, marginHorizontal: -4 },
    rail: { flexDirection: 'row', gap: 6, paddingHorizontal: 4, paddingVertical: 2 },
    railChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: t.line },
    railDone: { backgroundColor: t.soft, opacity: 0.55 },
    railNow: { backgroundColor: t.accent, borderColor: t.accent },
    railText: { fontSize: 13, color: t.muted },
    railTextNow: { color: t.accentFg, fontWeight: '700' },
    blockText: { fontFamily: serif, fontSize: Math.round((wide ? 32 : 26) * scale), lineHeight: Math.round((wide ? 44 : 36) * scale), color: t.fg },
    activity: { gap: 14, alignItems: 'flex-start', marginTop: 8 },
    activityClock: { fontSize: wide ? 96 : 72, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -2, color: t.fg },
    roundSpace: { width: 44, height: 44 },
    toolsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
    tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toolOn: { backgroundColor: t.accent },
    toolTextOn: { color: t.accentFg },
    lockedText: { flex: 1, textAlign: 'center', fontSize: 12, color: t.muted },
    preview: { aspectRatio: 16 / 9, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 14 },
    previewDim: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
    previewText: { fontFamily: serif, fontSize: 16, lineHeight: 22, color: '#FFFFFF', textAlign: 'center' },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line },
    swatchOn: { borderWidth: 3, borderColor: t.accent },
    timeBar: { flexDirection: 'row', gap: 3, paddingHorizontal: 16, paddingBottom: 8 },
    timeSegment: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: t.line },
    timeNow: { backgroundColor: t.muted },
    timeFill: { height: 5, backgroundColor: t.accent },
    mapBar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    map: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
    chip: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.soft },
    chipOn: { backgroundColor: t.accent },
    chipText: { fontSize: 14, color: t.muted, fontVariant: ['tabular-nums'] },
    chipTextOn: { color: t.accentFg, fontWeight: '700' },
    zone: { position: 'absolute', top: 0, bottom: 0, width: '16%', zIndex: 2 },
    zoneLeft: { left: 0 },
    zoneRight: { right: 0 },
    keywords: { fontFamily: serifBold, fontSize: Math.round((wide ? 48 : 36) * scale), lineHeight: Math.round((wide ? 56 : 43) * scale), color: t.fg },
    prepare: { padding: 24, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
    input: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, backgroundColor: t.card, fontSize: 17, color: t.fg },
    inputLong: { minHeight: 110, textAlignVertical: 'top' },
    answer: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: t.soft },
    sheet: { height: '72%', padding: 12, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: t.card },
  });

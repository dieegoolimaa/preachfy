import {
  goTo, isPaused, isReadyForPulpit, pace, pause, pulpitSections, remaining, resume,
  spentInSection, startSession, timerState, type Pace, type PulpitSession,
} from '@preachfy/core';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sampleStudy, studyText } from '@/lib/sample';
import { paper, serif, serifBold, stage, type Theme } from '@/lib/theme';

const study = sampleStudy;

function clock(ms: number) {
  const seconds = Math.round(Math.abs(ms) / 1000);
  const text = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return ms < 0 ? `+${text}` : text;
}

function paceLabel(value: Pace) {
  if (value.kind === 'onPace') return 'No ritmo';
  return `${clock(value.ms)} ${value.kind === 'behind' ? 'atrás' : 'adiantado'}`;
}

export default function Pulpit() {
  const [session, setSession] = useState<PulpitSession>(() => startSession(pulpitSections(study), Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [dark, setDark] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 768;
  const t = dark ? stage : paper;
  const s = themed(t, wide);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    activateKeepAwakeAsync('pulpit').catch(() => {});
    return () => {
      clearInterval(id);
      deactivateKeepAwake('pulpit').catch(() => {});
    };
  }, []);

  const move = useCallback((delta: number) => {
    setSession((current) => goTo(current, current.currentIndex + delta, Date.now()));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); move(1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); move(-1); }
      if (e.key.toLowerCase() === 't') setContextOpen((open) => !open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  if (!isReadyForPulpit(study)) return null;

  const index = session.currentIndex;
  const step = study.steps[index]!;
  const next = study.steps[index + 1];
  const base = studyText(step.baseText);
  const context = studyText(study.context);
  const state = timerState(session, now);
  const timeColor = state === 'over' ? t.over : state === 'warning' ? t.warn : t.fg;
  const contextBody = (
    <ScrollView contentContainerStyle={s.contextBody}>
      <Text style={s.label}>{context?.label}</Text>
      <Text style={s.contextText}>{context?.body}</Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.page}>
      <View style={s.top}>
        <Pressable testID="exit" style={s.tool} onPress={() => router.back()}><Text style={s.toolText}>Sair</Text></Pressable>
        <View style={s.timerBox}>
          <Text testID="timer" style={[s.timer, { color: timeColor }]}>{clock(remaining(session, now))}</Text>
          <Text testID="pace" style={s.pace}>
            {paceLabel(pace(session))} · neste passo {clock(spentInSection(session, index, now))}
          </Text>
        </View>
        <Pressable
          testID="pause"
          style={s.tool}
          onPress={() => setSession((c) => (isPaused(c) ? resume(c, Date.now()) : pause(c, Date.now())))}>
          <Text style={s.toolText}>{isPaused(session) ? 'Retomar' : 'Pausar'}</Text>
        </Pressable>
      </View>

      <View style={s.flow} testID="flow">
        {study.steps.map((item, i) => (
          <View key={item.id} style={s.flowItem}>
            {i > 0 ? <View style={[s.link, i <= index && s.linkDone]} /> : null}
            <Pressable
              testID={`node-${i}`}
              onPress={() => setSession((c) => goTo(c, i, Date.now()))}
              style={[s.node, i < index && s.nodeDone, i === index && s.nodeNow]}>
              <Text style={[s.nodeText, i === index && s.nodeTextNow]}>{i + 1}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={s.body}>
        <ScrollView style={s.main} contentContainerStyle={s.mainInner}>
          <Text style={s.label}>Passo {index + 1} de {study.steps.length}</Text>
          <Text testID="step-title" style={s.title}>{step.title}</Text>
          <View style={s.base}>
            {base?.label ? <Text style={s.label}>{base.label}</Text> : null}
            <Text testID="base-text" style={s.baseText}>{base?.body}</Text>
          </View>
          <Text testID="notes" style={s.notes}>{step.notes}</Text>
          {next ? <Text style={s.nextHint}>A seguir: {next.title}</Text> : null}
        </ScrollView>
        {wide && contextOpen ? <View testID="context-pane" style={s.pane}>{contextBody}</View> : null}
      </View>

      <View style={s.bottom}>
        <Pressable testID="prev" disabled={index === 0} style={[s.nav, index === 0 && s.off]} onPress={() => move(-1)}>
          <Text style={s.navText}>← Anterior</Text>
        </Pressable>
        <Pressable testID="context" style={s.tool} onPress={() => setContextOpen((o) => !o)}>
          <Text style={s.toolText}>Contexto</Text>
        </Pressable>
        <Pressable testID="theme" style={s.tool} onPress={() => setDark((d) => !d)}>
          <Text style={s.toolText}>{dark ? 'Claro' : 'Palco'}</Text>
        </Pressable>
        <Pressable
          testID="next"
          disabled={!next}
          style={[s.nav, s.navMain, !next && s.off]}
          onPress={() => move(1)}>
          <Text style={[s.navText, s.navTextMain]}>Próximo →</Text>
        </Pressable>
      </View>

      <Modal visible={!wide && contextOpen} transparent animationType="slide" onRequestClose={() => setContextOpen(false)}>
        <View style={s.sheetBackdrop}>
          <View testID="context-sheet" style={s.sheet}>
            <Pressable style={s.tool} onPress={() => setContextOpen(false)}><Text style={s.toolText}>Fechar</Text></Pressable>
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
    timer: { fontSize: wide ? 44 : 36, fontWeight: '600', fontVariant: ['tabular-nums'] },
    pace: { fontSize: 13, color: t.muted, textAlign: 'center' },
    tool: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: t.line, backgroundColor: t.soft, alignSelf: 'flex-start' },
    toolText: { fontSize: 15, color: t.fg },
    flow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.line },
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
    mainInner: { padding: wide ? 32 : 20, gap: 16, maxWidth: 860, width: '100%', alignSelf: 'center' },
    label: { fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: t.muted },
    title: { fontFamily: serifBold, fontSize: wide ? 40 : 30, lineHeight: wide ? 46 : 36, color: t.fg },
    base: { gap: 8, paddingLeft: 16, borderLeftWidth: 5, borderLeftColor: t.mark },
    baseText: { fontFamily: serif, fontSize: wide ? 34 : 26, lineHeight: wide ? 46 : 36, color: t.fg },
    notes: { fontSize: wide ? 24 : 20, lineHeight: wide ? 34 : 29, color: t.fg },
    nextHint: { fontSize: 15, color: t.muted },
    pane: { width: '36%', borderLeftWidth: 1, borderLeftColor: t.line },
    contextBody: { padding: 20, gap: 10 },
    contextText: { fontFamily: serif, fontSize: 21, lineHeight: 31, color: t.fg },
    bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: t.line },
    nav: { flexGrow: 1, flexBasis: wide ? 160 : '40%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: t.line, backgroundColor: t.soft },
    navMain: { backgroundColor: t.accent, borderColor: t.accent },
    navText: { fontSize: 18, fontWeight: '600', color: t.fg },
    navTextMain: { color: t.accentFg },
    off: { opacity: 0.4 },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { height: '72%', padding: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: t.bg },
  });

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Field, Heading, Hint, Pill, Screen, ui } from '@/components/ui';
import { API_URL } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { newId } from '@/lib/ids';
import { readLive, type LiveView } from '@/lib/live';
import { paper, serif } from '@/lib/theme';

const POLL_MS = 2500;
const key = (code: string) => `preachfy.live.${code}`;
type Saved = { participantId: string; nickname: string; notes: string; sent: Record<string, string> };

/** The student's page: no account, no install. Notes stay on this device. */
export default function LiveClass() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const { t } = useT();
  const [view, setView] = useState<LiveView | null | undefined>(undefined);
  const [mine, setMine] = useState<Saved>({ participantId: newId(), nickname: '', notes: '', sent: {} });
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(key(code))
      .then((saved) => {
        if (saved) setMine(JSON.parse(saved));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, [code]);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(key(code), JSON.stringify(mine)).catch(() => {});
  }, [mine, code]);

  useEffect(() => {
    let live = true;
    const load = () => readLive(code).then((found) => live && setView(found), () => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [code]);

  if (view === undefined) return <Screen title="Preachfy">{null}</Screen>;
  if (view === null) {
    return (
      <Screen title="Preachfy">
        <Hint testID="live-gone">{t('classGone')}</Hint>
      </Screen>
    );
  }

  const step = view.ended ? undefined : view.steps[view.current];
  const answered = step ? mine.sent[step.id] : undefined;

  const send = async () => {
    if (!step) return;
    setFailed(false);
    try {
      const response = await fetch(`${API_URL}/live/${encodeURIComponent(code)}/answers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ participantId: mine.participantId, nickname: mine.nickname, stepId: step.id, text: draft }),
      });
      if (!response.ok) throw new Error();
      setMine({ ...mine, sent: { ...mine.sent, [step.id]: draft } });
      setDraft('');
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen title={view.title} testID="live-class">
      {view.goal ? <Hint testID="live-goal">{view.goal}</Hint> : null}

      {!view.started && !view.ended ? (
        <>
          <Hint testID="live-waiting">{t('classNotStarted')}</Hint>
          {view.context ? (
            <Card testID="live-context">
              <Text style={ui.label}>{view.context.label}</Text>
              <Text style={s.text}>{view.context.body}</Text>
            </Card>
          ) : null}
        </>
      ) : null}

      {step ? (
        <Card testID="live-step">
          <Text style={ui.label}>{t('stepOf', { i: view.current + 1, n: view.total })}</Text>
          <Text testID="live-step-title" style={ui.cardTitle}>{step.title}</Text>
          {step.label ? <Text style={ui.label}>{step.label}</Text> : null}
          <Text testID="live-step-body" style={s.text}>{step.body}</Text>
        </Card>
      ) : null}

      {view.highlight ? (
        <Card testID="live-highlight">
          <Text style={ui.label}>{t('fromTheClass')}</Text>
          <Text style={s.text}>{view.highlight}</Text>
        </Card>
      ) : null}

      {step?.question ? (
        <Card testID="live-question">
          <Text style={ui.cardTitle}>{step.question}</Text>
          {answered ? <Hint testID="live-answered">{t('answerSent')}: {answered}</Hint> : null}
          <Field testID="live-nickname" value={mine.nickname} onChangeText={(nickname) => setMine({ ...mine, nickname })} placeholder={t('nicknameHint')} />
          <Field testID="live-answer" multiline value={draft} onChangeText={setDraft} placeholder={t('yourAnswer')} />
          <Pill testID="live-send" primary disabled={!draft.trim()} label={t('send')} onPress={send} />
          {failed ? <Text style={ui.error}>{t('offline')}</Text> : null}
        </Card>
      ) : null}

      {view.ended ? (
        <>
          <Heading>{t('classSummary')}</Heading>
          {view.closing ? <Text testID="live-closing-text" style={s.text}>{view.closing}</Text> : null}
          {view.steps.map((item) => (
            <Card key={item.id} testID="live-summary-step">
              <Text style={ui.cardTitle}>{item.title}</Text>
              {item.label ? <Text style={ui.label}>{item.label}</Text> : null}
              <Text style={s.text}>{item.body}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <View>
        <Field testID="live-notes" label={t('yourNotes')} multiline value={mine.notes} onChangeText={(notes) => setMine({ ...mine, notes })} />
        <Hint>{t('notesStayHere')}</Hint>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({ text: { fontFamily: serif, fontSize: 20, lineHeight: 29, color: paper.fg } });

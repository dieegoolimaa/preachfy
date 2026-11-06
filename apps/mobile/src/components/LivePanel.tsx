import type { Study } from '@preachfy/core';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Qr } from '@/components/Qr';
import { Card, Field, Hint, Pill, ui } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { classLink, endLive, openLive, readLive, screenLink } from '@/lib/live';
import { requirePro } from '@/lib/pro';
import { useReader } from '@/lib/store';
import { paper } from '@/lib/theme';

/** Opens the class link for students and the screen link for the media computer. */
export function LivePanel({ study }: { study: Study }) {
  const { t, locale } = useT();
  const { liveCodes } = useReader();
  const code = liveCodes[study.id];
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState('');
  const [closing, setClosing] = useState('');
  const isClass = study.kind === 'class';

  useEffect(() => {
    if (!code) return;
    // A class that expired on the server should not look open here.
    readLive(code)
      .then((view) => {
        if (view === null) return endLive(study.id, code, '');
      })
      .catch(() => {});
  }, [code, study.id]);

  const open = async () => {
    if (!requirePro('liveClass')) return;
    setBusy(true);
    setFailed(false);
    const created = await openLive(study, locale).catch(() => null);
    setFailed(!created);
    setBusy(false);
  };

  const copy = async (link: string) => {
    await Clipboard.setStringAsync(link);
    setCopied(link);
  };

  if (!code) {
    return (
      <View style={{ gap: 6 }}>
        <Pill testID="open-live" big disabled={busy} label={t(isClass ? 'shareClass' : 'openScreen')} onPress={open} />
        <Hint>{t(isClass ? 'shareClassHint' : 'openScreenHint')}</Hint>
        {failed ? <Text testID="live-error" style={ui.error}>{t('offline')}</Text> : null}
      </View>
    );
  }

  return (
    <Card testID="live-panel">
      <Text style={ui.label}>{t(isClass ? 'liveNow' : 'screenLive')}</Text>
      {isClass ? <Text testID="live-code" style={s.code}>{code}</Text> : null}
      <Qr testID="live-qr" value={isClass ? classLink(code) : screenLink(code)} />
      <Hint>{isClass ? classLink(code) : screenLink(code)}</Hint>
      <View style={ui.row}>
        {isClass ? <Pill plain testID="copy-class" label={t('copyClassLink')} onPress={() => copy(classLink(code))} /> : null}
        <Pill plain testID="copy-screen" label={t('copyScreenLink')} onPress={() => copy(screenLink(code))} />
      </View>
      {copied ? <Hint>{t('copied')}</Hint> : null}
      <Hint>{t('screenHint')}</Hint>
      {isClass ? <Field testID="live-closing" label={t('closingLabel')} multiline value={closing} onChangeText={setClosing} /> : null}
      <Pill plain danger testID="end-live" label={t(isClass ? 'endClass' : 'endScreen')} onPress={() => endLive(study.id, code, closing)} />
    </Card>
  );
}

const s = StyleSheet.create({ code: { fontSize: 34, fontWeight: '700', letterSpacing: 4, textAlign: 'center', color: paper.fg } });

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { readLive, type LiveView } from '@/lib/live';
import { sans, sansBold, serif, stage } from '@/lib/theme';

const POLL_MS = 1500;

/** For the media computer: a projector window or a browser source in OBS or Holyrics. */
export default function Projection() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const [view, setView] = useState<LiveView | null>(null);
  const { width } = useWindowDimensions();
  const size = Math.max(28, Math.min(72, width / 22));

  useEffect(() => {
    let live = true;
    const load = () => readLive(code).then((found) => live && found && setView(found), () => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [code]);

  const step = view?.started && !view.ended ? view.steps[view.current] : undefined;
  const text = view?.highlight ?? step?.body ?? '';
  const label = view?.highlight ? '' : step?.label;

  return (
    <View style={s.page} testID="projection">
      <Text testID="projection-text" style={[s.text, { fontFamily: sans, fontSize: size, lineHeight: size * 1.3 }]}>{text || (view && !view.ended ? view.title : '')}</Text>
      {label ? <Text testID="projection-label" style={s.label}>{label}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', gap: 24, padding: '6%', backgroundColor: stage.bg },
  text: { fontFamily: serif, color: stage.fg, textAlign: 'center' },
  label: { fontFamily: sansBold, fontSize: 24, color: stage.mark, textAlign: 'center' },
});

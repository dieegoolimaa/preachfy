import type { PulpitRun, Study } from '@preachfy/core';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Pill, ui } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { recordingFile } from '@/lib/recording';

const clock = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Listening by step: each chapter jumps to where that step began. */
export function RunAudio({ run, study }: { run: PulpitRun; study: Study }) {
  const { t } = useT();
  const audio = run.audio!;
  const file = useMemo(() => recordingFile(audio.file), [audio.file]);
  const player = useAudioPlayer(file.exists ? file.uri : null);
  const status = useAudioPlayerStatus(player);

  if (!file.exists) return <Text style={ui.hint}>{t('audioElsewhere')}</Text>;

  return (
    <View style={ui.field}>
      <Pill
        plain
        testID="audio-play"
        icon={status.playing ? 'pause' : 'play'}
        label={`${clock(status.currentTime * 1000)} / ${clock(audio.durationMs)}`}
        onPress={() => (status.playing ? player.pause() : player.play())}
      />
      {audio.chapters.map((chapter) => (
        <Pill
          key={`${chapter.stepIndex}-${chapter.atMs}`}
          plain
          label={`${clock(chapter.atMs)} · ${study.steps[chapter.stepIndex]?.title ?? ''}`}
          onPress={() => {
            player.seekTo(chapter.atMs / 1000);
            player.play();
          }}
        />
      ))}
    </View>
  );
}

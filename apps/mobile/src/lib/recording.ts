import { addChapter, type RecordingChapter, type RunAudio } from '@preachfy/core';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const canRecord = Platform.OS !== 'web';

const folder = () => new Directory(Paths.document, 'recordings');

/** The saved name survives app updates; the full path does not. */
export const recordingFile = (name: string) => new File(folder(), name);

/** Records beside the Pulpit. A failure here never stops the speaker. */
export function useSermonRecorder(stepIndex: number, paused: boolean) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const status = useAudioRecorderState(recorder, 500);
  const [active, setActive] = useState(false);
  const [denied, setDenied] = useState(false);
  const chapters = useRef<RecordingChapter[]>([]);
  const elapsed = status.durationMillis;

  useEffect(() => {
    if (active) chapters.current = addChapter(chapters.current, elapsed, stepIndex);
    // Only a change of step adds a chapter, not the passing of time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  useEffect(() => {
    if (!active) return;
    if (paused) recorder.pause();
    else recorder.record();
  }, [active, paused, recorder]);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    setDenied(!granted);
    if (!granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
    await recorder.prepareToRecordAsync();
    chapters.current = [];
    recorder.record();
    setActive(true);
  }, [recorder]);

  /** Moves the file out of the cache, so the system does not clear it. */
  const stop = useCallback(
    async (name: string): Promise<RunAudio | undefined> => {
      if (!active) return undefined;
      const durationMs = recorder.getStatus().durationMillis;
      await recorder.stop();
      setActive(false);
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) return undefined;
      if (!folder().exists) folder().create();
      const file = `${name}.m4a`;
      new File(recorder.uri).move(recordingFile(file));
      return { file, durationMs, chapters: chapters.current };
    },
    [active, recorder],
  );

  return { active, denied, elapsed, start, stop };
}

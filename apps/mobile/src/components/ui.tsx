import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { paper, serifBold } from '@/lib/theme';

type ScreenProps = { title: string; right?: ReactNode; close?: boolean; children: ReactNode; testID?: string };

/** The frame of every list and form, the same on iPhone, iPad and web. */
export function Screen({ title, right, close, children, testID }: ScreenProps) {
  const { t } = useT();
  return (
    <SafeAreaView style={ui.page} testID={testID}>
      <View style={ui.header}>
        <Text style={ui.title} numberOfLines={1}>{title}</Text>
        <View style={ui.row}>
          {right}
          {close ? <Pill testID="close" label={t('close')} onPress={() => goBack()} /> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={ui.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  );
}

type PillProps = { label: string; onPress: () => void; primary?: boolean; disabled?: boolean; testID?: string };

export function Pill({ label, onPress, primary, disabled, testID }: PillProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      style={[ui.pill, primary && ui.pillOn, disabled && ui.off]}
      onPress={onPress}>
      <Text style={[ui.pillText, primary && ui.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label?: string }) {
  return (
    <View style={ui.field}>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={paper.muted}
        {...input}
        style={[ui.input, input.multiline && ui.inputLong, input.editable === false && ui.inputOff]}
      />
    </View>
  );
}

export function Card({ children, onPress, testID }: { children: ReactNode; onPress?: () => void; testID?: string }) {
  if (!onPress) return <View style={ui.card} testID={testID}>{children}</View>;
  return <Pressable testID={testID} style={ui.card} onPress={onPress}>{children}</Pressable>;
}

export const Heading = ({ children }: { children: ReactNode }) => <Text style={ui.heading}>{children}</Text>;
export const Hint = ({ children, testID }: { children: ReactNode; testID?: string }) => <Text testID={testID} style={ui.hint}>{children}</Text>;

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: paper.line },
  title: { flexShrink: 1, fontFamily: serifBold, fontSize: 26, color: paper.fg },
  body: { padding: 20, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft },
  pillOn: { backgroundColor: paper.accent, borderColor: paper.accent },
  pillText: { fontSize: 15, color: paper.fg, textAlign: 'center' },
  pillTextOn: { color: paper.accentFg, fontWeight: '600' },
  off: { opacity: 0.4 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: paper.muted },
  input: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.soft, fontSize: 16, color: paper.fg },
  inputLong: { minHeight: 110, textAlignVertical: 'top' },
  inputOff: { color: paper.muted },
  card: { gap: 8, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: paper.line, backgroundColor: paper.bg },
  cardTitle: { fontFamily: serifBold, fontSize: 20, color: paper.fg },
  heading: { fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: paper.muted, marginTop: 8 },
  hint: { fontSize: 14, lineHeight: 20, color: paper.muted },
  error: { fontSize: 14, color: paper.accent },
});

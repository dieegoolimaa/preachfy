import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/iconNames';
import { useT } from '@/lib/i18n';
import { goBack } from '@/lib/navigation';
import { paper, serifBold } from '@/lib/theme';

export type { IconName };

type ScreenProps = { title: string; right?: ReactNode; close?: boolean; wide?: boolean; children: ReactNode; testID?: string };

/** Tab screens open with a large title; pushed screens get a bar with a back button. */
export function Screen({ title, right, close, wide, children, testID }: ScreenProps) {
  const { t } = useT();
  return (
    <SafeAreaView style={ui.page} edges={close ? ['top', 'bottom'] : ['top']} testID={testID}>
      {close ? (
        <View style={ui.navBar}>
          <Pressable testID="close" accessibilityRole="button" style={ui.back} onPress={() => goBack()}>
            <Icon name="chevron-back" size={22} color={paper.accent} />
            <Text style={ui.backText}>{t('back')}</Text>
          </Pressable>
          <Text style={ui.navTitle} numberOfLines={1}>{title}</Text>
          <View style={ui.navRight}>{right}</View>
        </View>
      ) : (
        <View style={ui.tabBarTop}>{right}</View>
      )}
      <ScrollView contentContainerStyle={[ui.body, wide && ui.bodyWide]} keyboardShouldPersistTaps="handled">
        {close ? null : <Title>{title}</Title>}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The brand's gesture: a stroke of highlighter under the title. */
export function Title({ children }: { children: string }) {
  return (
    <View style={ui.titleWrap}>
      <View style={ui.titleMark} />
      <Text style={ui.largeTitle}>{children}</Text>
    </View>
  );
}

type PillProps = {
  label: string; onPress: () => void; primary?: boolean; big?: boolean; plain?: boolean; danger?: boolean;
  disabled?: boolean; testID?: string; icon?: IconName;
};

/** Filled for the main action, tinted for the others, plain inside lists. */
export function Pill({ label, onPress, primary, big, plain, danger, disabled, testID, icon }: PillProps) {
  const color = primary ? paper.accentFg : danger ? paper.over : paper.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [ui.pill, big && ui.pillBig, primary && ui.pillOn, plain && ui.pillPlain, (disabled || pressed) && ui.off]}
      onPress={onPress}>
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text style={[ui.pillText, big && ui.pillTextBig, { color }, primary && ui.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** A round toolbar button, as in the navigation bars of Apple apps. */
export function IconButton({ icon, onPress, testID, label, color = paper.accent, disabled }: { icon: IconName; onPress: () => void; testID?: string; label: string; color?: string; disabled?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} hitSlop={6} style={[ui.iconButton, disabled && ui.off]} onPress={onPress}>
      <Icon name={icon} size={24} color={color} />
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ui.chipsBar} contentContainerStyle={ui.chips}>{children}</ScrollView>
  );
}

export function Chip({ label, on, onPress, testID, disabled }: { label: string; on?: boolean; onPress: () => void; testID?: string; disabled?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: Boolean(on) }} disabled={disabled} hitSlop={6} style={[ui.chip, on && ui.chipOn, disabled && ui.off]} onPress={onPress}>
      <Text style={[ui.chipText, on && ui.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

type SegmentedProps<K extends string> = { options: { key: K; label: string; testID?: string }[]; value: K; onChange: (key: K) => void };

export function Segmented<K extends string>({ options, value, onChange }: SegmentedProps<K>) {
  return (
    <View style={ui.segmented}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          testID={option.testID}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.key === value }}
          style={[ui.segment, option.key === value && ui.segmentOn]}
          onPress={() => onChange(option.key)}>
          <Text style={[ui.segmentText, option.key === value && ui.segmentTextOn]} numberOfLines={1}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** An inset grouped list, with a hairline between rows. */
export function Group({ title, footer, children, testID }: { title?: string; footer?: string; children?: ReactNode; testID?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={ui.group} testID={testID}>
      {title ? <Text style={ui.groupTitle}>{title}</Text> : null}
      {rows.length ? (
        <View style={ui.groupBody}>
          {rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? <View style={ui.separator} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {footer ? <Text style={ui.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

type RowProps = {
  label: string; detail?: string; value?: string; onPress?: () => void; testID?: string; labelTestID?: string;
  danger?: boolean; tint?: boolean; right?: ReactNode;
};

export function Row({ label, detail, value, onPress, testID, labelTestID, danger, tint, right }: RowProps) {
  const body = (
    <>
      <View style={ui.rowText}>
        <Text testID={labelTestID} style={[ui.rowLabel, danger && ui.rowDanger, tint && ui.rowTint]}>{label}</Text>
        {detail ? <Text style={ui.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={ui.rowValue} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && !danger && !tint ? <Icon name="chevron-forward" size={15} color={paper.muted} /> : null}
    </>
  );
  if (!onPress) return <View testID={testID} style={ui.listRow}>{body}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" style={({ pressed }) => [ui.listRow, pressed && ui.rowPressed]} onPress={onPress}>
      {body}
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label?: string }) {
  return (
    <View style={ui.field}>
      {label ? <Text style={ui.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#A0A0A6"
        {...input}
        style={[ui.input, input.multiline && ui.inputLong, input.editable === false && ui.inputOff]}
      />
    </View>
  );
}

export function Card({ children, onPress, testID }: { children: ReactNode; onPress?: () => void; testID?: string }) {
  if (!onPress) return <View style={ui.card} testID={testID}>{children}</View>;
  return <Pressable testID={testID} style={({ pressed }) => [ui.card, pressed && ui.rowPressed]} onPress={onPress}>{children}</Pressable>;
}

export const Heading = ({ children }: { children: ReactNode }) => <Text style={ui.heading}>{children}</Text>;
export const Hint = ({ children, testID }: { children: ReactNode; testID?: string }) => <Text testID={testID} style={ui.hint}>{children}</Text>;

const hairline = StyleSheet.hairlineWidth;

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, borderBottomWidth: hairline, borderBottomColor: paper.line, backgroundColor: paper.bg },
  back: { flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 44 },
  backText: { fontSize: 17, color: paper.accent },
  navTitle: { flex: 2, textAlign: 'center', fontFamily: serifBold, fontSize: 19, color: paper.fg },
  navRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  tabBarTop: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, gap: 4 },
  titleWrap: { alignSelf: 'flex-start', paddingHorizontal: 2 },
  titleMark: { position: 'absolute', left: 0, right: 0, bottom: 7, height: 14, backgroundColor: paper.mark },
  largeTitle: { fontFamily: serifBold, fontSize: 38, lineHeight: 46, letterSpacing: -0.6, color: paper.fg },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  bodyWide: { maxWidth: 1080 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingVertical: 11 },
  rowPressed: { opacity: 0.55 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 17, color: paper.fg },
  rowDetail: { fontSize: 14, lineHeight: 19, color: paper.muted },
  rowValue: { flexShrink: 1, fontSize: 16, color: paper.muted },
  rowDanger: { color: paper.over },
  rowTint: { color: paper.fg, fontWeight: '600' },
  group: { gap: 4 },
  groupTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, color: paper.muted, textTransform: 'uppercase' },
  groupFooter: { fontSize: 13, lineHeight: 18, color: paper.muted },
  groupBody: { borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: paper.line },
  separator: { height: hairline, backgroundColor: paper.line },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { flexDirection: 'row', gap: 6, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: paper.soft },
  pillBig: { minHeight: 52, borderRadius: 26, alignSelf: 'stretch' },
  pillOn: { backgroundColor: paper.accent },
  pillPlain: { backgroundColor: 'transparent', paddingHorizontal: 2 },
  pillText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  pillTextBig: { fontSize: 17, fontWeight: '600' },
  pillTextOn: { fontWeight: '600' },
  off: { opacity: 0.4 },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipsBar: { flexGrow: 0, marginHorizontal: -20 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip: { height: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 17, backgroundColor: paper.soft },
  chipOn: { backgroundColor: paper.accent },
  chipText: { fontSize: 15, color: paper.fg },
  chipTextOn: { color: paper.accentFg, fontWeight: '600' },
  segmented: { flexDirection: 'row', padding: 2, borderRadius: 10, backgroundColor: paper.soft },
  segment: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentOn: { backgroundColor: paper.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segmentText: { fontSize: 14, color: paper.fg },
  segmentTextOn: { fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, color: paper.muted, textTransform: 'uppercase' },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: paper.soft, fontSize: 17, color: paper.fg },
  inputLong: { minHeight: 88, textAlignVertical: 'top' },
  inputOff: { color: paper.muted },
  card: { gap: 6, paddingVertical: 14, borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: paper.line },
  cardTitle: { fontFamily: serifBold, fontSize: 21, lineHeight: 26, color: paper.fg },
  heading: { fontFamily: serifBold, fontSize: 24, lineHeight: 30, color: paper.fg, marginTop: 8 },
  hint: { fontSize: 15, lineHeight: 21, color: paper.muted },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 1.4, color: paper.muted, textTransform: 'uppercase' },
  error: { fontSize: 15, color: paper.over },
});

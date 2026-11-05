import { router, Slot, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { paper, sans, sansBold } from '@/lib/theme';

const tabs = [
  { key: 'today', href: '/', label: 'today' },
  { key: 'bible', href: '/bible', label: 'bible' },
  { key: 'create', href: '/create', label: 'create' },
  { key: 'community', href: '/community', label: 'community' },
  { key: 'settings', href: '/settings', label: 'settings' },
] as const;

/** Tabs at the bottom on iPhone; a sidebar on iPad and on the web. */
export default function Shell() {
  const { t } = useT();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const wide = width >= 768;

  const items = tabs.map((tab) => {
    const on = path === tab.href;
    return (
      <Pressable
        key={tab.key}
        testID={`tab-${tab.key}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[wide ? s.railItem : s.barItem, on && wide && s.railOn]}
        onPress={() => router.navigate(tab.href as Href)}>
        <Text numberOfLines={1} style={[wide ? s.railText : s.barText, on && s.textOn]}>{t(tab.label)}</Text>
      </Pressable>
    );
  });

  return (
    <View style={[s.shell, wide && s.wide]}>
      {wide ? (
        <View style={s.rail}>
          <Text style={s.brand}>Preachfy</Text>
          {items}
        </View>
      ) : null}
      <View style={s.content}><Slot /></View>
      {wide ? null : <View style={[s.bar, { paddingBottom: bottom }]}>{items}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: paper.bg },
  wide: { flexDirection: 'row' },
  content: { flex: 1 },
  rail: { width: 220, gap: 4, padding: 16, paddingTop: 24, borderRightWidth: 1, borderRightColor: paper.line, backgroundColor: paper.soft },
  brand: { fontFamily: sansBold, fontSize: 24, color: paper.accent, paddingHorizontal: 12, paddingBottom: 16 },
  railItem: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  railOn: { backgroundColor: paper.line },
  railText: { fontFamily: sans, fontSize: 16, color: paper.fg },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: paper.line, backgroundColor: paper.bg },
  barItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  barText: { fontFamily: sans, fontSize: 12, color: paper.muted },
  textOn: { color: paper.accent, fontFamily: sansBold },
});

import { router, Slot, usePathname, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { useReader } from '@/lib/store';
import { paper, readingThemes, serifBold } from '@/lib/theme';

const tabs: { key: 'today' | 'bible' | 'create' | 'community' | 'settings'; href: string }[] = [
  { key: 'today', href: '/' },
  { key: 'bible', href: '/bible' },
  { key: 'create', href: '/create' },
  { key: 'community', href: '/community' },
  { key: 'settings', href: '/settings' },
];

/** A tab bar on iPhone; a sidebar on iPad and on the web. */
export default function Shell() {
  const { t } = useT();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const wide = width >= 768;
  const { readerTheme } = useReader();
  const page = path === '/bible' && !wide ? readingThemes[readerTheme] : null;

  const items = tabs.map((tab) => {
    const on = path === tab.href;
    const color = on ? (page?.fg ?? paper.fg) : (page?.muted ?? paper.muted);
    return (
      <Pressable
        key={tab.key}
        testID={`tab-${tab.key}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[wide ? s.railItem : s.barItem, on && wide && s.railOn]}
        onPress={() => router.navigate(tab.href as Href)}>
        <View style={s.label}>
          {on && !wide ? <View style={s.mark} /> : null}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={wide ? [s.railText, on && s.railTextOn] : [s.barText, { color }, on && s.barTextOn]}>{t(tab.key)}</Text>
        </View>
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
      {wide ? null : <View style={[s.bar, { paddingBottom: bottom }, Platform.OS === 'web' && s.glass, page && { backgroundColor: page.bg, borderTopColor: page.line }]}>{items}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: paper.bg },
  wide: { flexDirection: 'row' },
  content: { flex: 1 },
  rail: { width: 260, gap: 2, paddingHorizontal: 12, paddingTop: 20, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: paper.line, backgroundColor: paper.bg },
  brand: { fontFamily: serifBold, fontSize: 30, color: paper.fg, paddingHorizontal: 10, paddingBottom: 14 },
  railItem: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 10, borderRadius: 10 },
  railOn: { backgroundColor: paper.soft },
  railText: { fontSize: 17, color: paper.muted },
  railTextOn: { color: paper.fg, fontWeight: '600' },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line, backgroundColor: 'rgba(252,252,251,0.94)' },
  glass: { backdropFilter: 'blur(20px)' } as object,
  barItem: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  label: { alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', left: -2, right: -2, bottom: 0, height: 7, backgroundColor: paper.mark },
  barText: { fontSize: 12, fontWeight: '500' },
  barTextOn: { fontWeight: '700' },
});

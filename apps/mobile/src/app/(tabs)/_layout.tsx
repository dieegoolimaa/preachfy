import { router, Slot, usePathname, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/iconNames';
import { useT } from '@/lib/i18n';
import { useReader } from '@/lib/store';
import { paper, readingThemes, serifBold } from '@/lib/theme';

const tabs: { key: 'today' | 'bible' | 'create' | 'community' | 'settings'; href: string; icon: IconName }[] = [
  { key: 'today', href: '/', icon: 'sun' },
  { key: 'bible', href: '/bible', icon: 'book' },
  { key: 'create', href: '/create', icon: 'create' },
  { key: 'community', href: '/community', icon: 'people' },
  { key: 'settings', href: '/settings', icon: 'sliders' },
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
    const color = on ? (page?.fg ?? paper.accent) : (page?.muted ?? '#8E8E93');
    return (
      <Pressable
        key={tab.key}
        testID={`tab-${tab.key}`}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={[wide ? s.railItem : s.barItem, on && wide && s.railOn]}
        onPress={() => router.navigate(tab.href as Href)}>
        <Icon name={tab.icon} size={wide ? 20 : 24} color={color} />
        <Text numberOfLines={1} style={wide ? [s.railText, on && s.railTextOn] : [s.barText, { color }]}>{t(tab.key === 'create' ? 'prepare' : tab.key)}</Text>
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
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 10, borderRadius: 10 },
  railOn: { backgroundColor: paper.soft },
  railText: { fontSize: 17, color: paper.muted },
  railTextOn: { color: paper.fg, fontWeight: '600' },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paper.line, backgroundColor: 'rgba(252,252,251,0.94)' },
  glass: { backdropFilter: 'blur(20px)' } as object,
  barItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 4 },
  barText: { fontSize: 10, fontWeight: '500' },
});

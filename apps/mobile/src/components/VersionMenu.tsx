import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { paper } from '@/lib/theme';
import { translations } from '@/lib/translations';

type Props = { visible: boolean; selected: string; onSelect: (id: string) => void; onClose: () => void; top?: number; left?: number; testID?: string };

/** A dropdown with every Bible version, used wherever a version is chosen. */
export function VersionMenu({ visible, selected, onSelect, onClose, top, left = 12, testID = 'version' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable testID={`${testID}-backdrop`} style={s.backdrop} onPress={onClose}>
        <View style={[s.menu, { top: top ?? insets.top + 50, left }]} testID={`${testID}-menu`}>
          {translations.map((item) => (
            <Pressable
              key={item.id}
              testID={`${testID}-${item.id}`}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: item.id === selected }}
              style={s.item}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}>
              <View style={s.text}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.language}>{item.short} · {item.language}</Text>
              </View>
              {item.id === selected ? <Icon name="check" size={18} color={paper.fg} /> : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu: { position: 'absolute', width: 290, borderRadius: 14, backgroundColor: paper.card, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16 },
  text: { flex: 1, gap: 1 },
  name: { fontSize: 17, color: paper.fg },
  language: { fontSize: 13, color: paper.muted },
});

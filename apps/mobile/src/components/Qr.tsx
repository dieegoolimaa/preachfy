import QRCode from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';

/** Drawn with plain views, so it looks the same everywhere and needs no native module. */
export function Qr({ value, size = 200, testID }: { value: string; size?: number; testID?: string }) {
  const modules = useMemo(() => QRCode.create(value, { errorCorrectionLevel: 'M' }).modules, [value]);
  const cell = size / (modules.size + 8);
  const rows = Array.from({ length: modules.size }, (_, y) => y);
  return (
    <View testID={testID} style={{ padding: cell * 4, backgroundColor: '#FFFFFF', alignSelf: 'center' }}>
      {rows.map((y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {rows.map((x) => (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: modules.get(x, y) ? '#000000' : '#FFFFFF' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

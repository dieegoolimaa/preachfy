import { Text } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { IconName } from './iconNames';

type Props = { name: IconName; size: number; color: string };

/** Hairline strokes with round ends. Drawn here, so iPhone, iPad and web show the same icons. */
const lines: Partial<Record<IconName, string>> = {
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  bookmark: 'M7 4h10v16l-5-4-5 4z',
  book: 'M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z',
  check: 'M5 12.5l5 5L19 7',
  'chevron-back': 'M15 5l-7 7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  'chevron-forward': 'M9 5l7 7-7 7',
  'chevron-up': 'M5 15l7-7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  create: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z',
  'eye-off': 'M2.5 12C5 7.5 8.5 6 12 6s7 1.5 9.5 6c-2.5 4.5-6 6-9.5 6s-7-1.5-9.5-6zM4 4l16 16',
  eye: 'M2.5 12C5 7.5 8.5 6 12 6s7 1.5 9.5 6c-2.5 4.5-6 6-9.5 6s-7-1.5-9.5-6z',
  lock: 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  mic: 'M6 11a6 6 0 0 0 12 0M12 17v4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  people: 'M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 6.2a3 3 0 0 1 0 5.6M17.5 14.3c2.2.5 3.5 2.3 3.5 4.7',
  plus: 'M12 5v14M5 12h14',
  sliders: 'M4 7h8M18 7h2M4 17h2M12 17h8',
  search: 'M15 15l5 5',
  share: 'M12 15V4M8 8l4-4 4 4M6 12v7h12v-7',
  sun: 'M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8',
  tv: 'M9 21h6',
  verse: 'M5 7h14M5 12h14M5 17h9',
};

export function Icon({ name, size, color }: Props) {
  if (name === 'text-size') {
    return <Text style={{ fontSize: size * 0.8, lineHeight: size, color, fontWeight: '400', letterSpacing: -0.5 }}>Aa</Text>;
  }
  if (name === 'play') {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 5l11 7-11 7z" fill={color} /></Svg>;
  }
  if (name === 'pause') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="7" y="5" width="3.5" height="14" rx="1" fill={color} />
        <Rect x="13.5" y="5" width="3.5" height="14" rx="1" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {name === 'compare' ? <Rect x="4" y="5" width="16" height="14" rx="2" /> : null}
      {name === 'compare' ? <Path d="M12 5v14" /> : null}
      {name === 'copy' ? <Rect x="8" y="8" width="11" height="11" rx="2" /> : null}
      {name === 'copy' ? <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /> : null}
      {name === 'lock' ? <Rect x="6" y="11" width="12" height="9" rx="2" /> : null}
      {name === 'mic' ? <Rect x="9" y="3" width="6" height="11" rx="3" /> : null}
      {name === 'sun' ? <Circle cx="12" cy="12" r="4" /> : null}
      {name === 'people' ? <Circle cx="9" cy="8" r="3" /> : null}
      {name === 'sliders' ? <Circle cx="15" cy="7" r="2.2" /> : null}
      {name === 'sliders' ? <Circle cx="9" cy="17" r="2.2" /> : null}
      {name === 'search' ? <Circle cx="10.5" cy="10.5" r="6" /> : null}
      {name === 'eye' || name === 'eye-off' ? <Circle cx="12" cy="12" r="2.8" /> : null}
      {name === 'tv' ? <Rect x="3" y="5" width="18" height="12" rx="2" /> : null}
      {lines[name] ? <Path d={lines[name]} /> : null}
    </Svg>
  );
}

import { SymbolView, type SFSymbol } from 'expo-symbols';

import type { IconName, IconProps } from './iconNames';

const symbols: Record<IconName, SFSymbol> = {
  'add-circle': 'plus.circle.fill', 'arrow-down': 'arrow.down', 'arrow-up': 'arrow.up', blank: 'rectangle', book: 'book',
  'book-fill': 'book.fill', bookmark: 'bookmark', calendar: 'calendar', check: 'checkmark', 'chevron-back': 'chevron.left',
  'chevron-down': 'chevron.down', 'chevron-forward': 'chevron.right', 'chevron-up': 'chevron.up', close: 'xmark',
  compare: 'rectangle.split.2x1', copy: 'doc.on.doc', create: 'square.and.pencil', document: 'doc.text', eye: 'eye',
  'eye-off': 'eye.slash', gear: 'gearshape.fill', hand: 'hand.raised', highlighter: 'highlighter', info: 'info.circle',
  link: 'link', lock: 'lock', look: 'textformat', mic: 'mic', moon: 'moon', pause: 'pause.fill', people: 'person.2',
  'people-fill': 'person.2.fill', person: 'person.crop.circle', play: 'play.fill', 'qr-code': 'qrcode',
  radio: 'dot.radiowaves.left.and.right', school: 'graduationcap', search: 'magnifyingglass', share: 'square.and.arrow.up',
  star: 'star', sun: 'sun.max', 'sun-fill': 'sun.max.fill', sync: 'arrow.triangle.2.circlepath', 'text-size': 'textformat.size',
  tv: 'tv', verse: 'text.book.closed',
};

/** The real SF Symbols. The web has its own file, because they only exist on Apple systems. */
export function Icon({ name, size, color }: IconProps) {
  return <SymbolView name={symbols[name]} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}

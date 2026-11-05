import {
  ALargeSmall, ArrowDown, ArrowUp, Bookmark, BookOpen, BookText, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CirclePlus, CircleUser, Columns2, Copy, Eye, EyeOff, FileText, GraduationCap, Hand, Highlighter,
  Info, Link, Lock, Mic, Moon, Pause, Play, QrCode, Radio, RectangleHorizontal, RefreshCw, Search, Settings, Share, SquarePen,
  Star, Sun, Tv, Type, Users, X, type LucideIcon,
} from 'lucide-react';

import type { IconName, IconProps } from './iconNames';

const icons: Record<IconName, LucideIcon> = {
  'add-circle': CirclePlus, 'arrow-down': ArrowDown, 'arrow-up': ArrowUp, blank: RectangleHorizontal, book: BookOpen,
  'book-fill': BookOpen, bookmark: Bookmark, calendar: Calendar, check: Check, 'chevron-back': ChevronLeft,
  'chevron-down': ChevronDown, 'chevron-forward': ChevronRight, 'chevron-up': ChevronUp, close: X, compare: Columns2,
  copy: Copy, create: SquarePen, document: FileText, eye: Eye, 'eye-off': EyeOff, gear: Settings, hand: Hand,
  highlighter: Highlighter, info: Info, link: Link, lock: Lock, look: Type, mic: Mic, moon: Moon, pause: Pause, people: Users,
  'people-fill': Users, person: CircleUser, play: Play, 'qr-code': QrCode, radio: Radio, school: GraduationCap, search: Search,
  share: Share, star: Star, sun: Sun, 'sun-fill': Sun, sync: RefreshCw, 'text-size': ALargeSmall, tv: Tv, verse: BookText,
};

/** A thin line set close to SF Symbols, which browsers do not have. */
export function Icon({ name, size, color }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} color={color} strokeWidth={1.6} />;
}

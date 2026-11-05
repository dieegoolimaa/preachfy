export type IconName =
  | 'add-circle' | 'arrow-down' | 'arrow-up' | 'blank' | 'book' | 'book-fill' | 'bookmark' | 'calendar' | 'check'
  | 'chevron-back' | 'chevron-down' | 'chevron-forward' | 'chevron-up' | 'close' | 'compare' | 'copy' | 'create'
  | 'document' | 'eye' | 'eye-off' | 'gear' | 'hand' | 'highlighter' | 'info' | 'link' | 'lock' | 'look' | 'mic'
  | 'moon' | 'pause' | 'people' | 'people-fill' | 'person' | 'play' | 'qr-code' | 'radio' | 'school' | 'search'
  | 'share' | 'star' | 'sun' | 'sun-fill' | 'sync' | 'text-size' | 'tv' | 'verse';

export type IconProps = { name: IconName; size: number; color: string };

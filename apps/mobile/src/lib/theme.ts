export const paper = {
  bg: '#F7F8FC', fg: '#14162B', muted: '#5C6178', line: '#E1E4F0', soft: '#EEF0FA',
  accent: '#3A3FD9', accentFg: '#FFFFFF', mark: '#F2C14E', warn: '#8A5A00', over: '#C2272D',
};

export const stage: typeof paper = {
  bg: '#0A0B18', fg: '#F4F5FF', muted: '#9A9EC0', line: '#262948', soft: '#14162C',
  accent: '#9498FF', accentFg: '#0A0B18', mark: '#9498FF', warn: '#FFD166', over: '#FF8A80',
};

export type Theme = typeof paper;

// Bundled so everything looks the same on iPhone, iPad and web.
export const sans = 'Figtree_400Regular';
export const sansSemi = 'Figtree_600SemiBold';
export const sansBold = 'Figtree_700Bold';
/** Only for scripture, where a serif helps long reading. */
export const serif = 'Newsreader_400Regular';

export const categories = [
  { key: 'promessa', color: '#F2C14E' },
  { key: 'mandamento', color: '#F0875F' },
  { key: 'aplicacao', color: '#E9879B' },
  { key: 'cristo', color: '#A59CE8' },
  { key: 'revelacao', color: '#6FB7E8' },
  { key: 'contexto', color: '#7CCFC0' },
  { key: 'vida', color: '#9ED077' },
  { key: 'significado', color: '#C4B5A5' },
] as const;

export const categoryColor = (key: string) => categories.find((c) => c.key === key)?.color ?? paper.mark;

export const paper = {
  bg: '#FBFAF8', fg: '#1F1A1B', muted: '#6B6162', line: '#E4DEDB', soft: '#F3EEEA',
  accent: '#722F27', accentFg: '#FBFAF8', mark: '#F2C14E', warn: '#8A5A00', over: '#722F27',
};

export const stage: typeof paper = {
  bg: '#000000', fg: '#FFFFFF', muted: '#A6A0A0', line: '#2A2A2A', soft: '#121212',
  accent: '#FFD166', accentFg: '#000000', mark: '#FFD166', warn: '#FFD166', over: '#E08A7B',
};

export type Theme = typeof paper;

// Bundled so scripture looks the same on iPhone, iPad and web.
export const serif = 'Newsreader_400Regular';
export const serifBold = 'Newsreader_600SemiBold';

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

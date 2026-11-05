// Ink on neutral paper. The only color of the brand is the highlighter, what people do in the app.
export const paper = {
  bg: '#FCFCFB', card: '#FFFFFF', fg: '#16181D', muted: '#6B6F76', line: '#E2E2DF', soft: '#F2F2EF',
  accent: '#16181D', accentFg: '#FFFFFF', mark: '#FFD43B', warn: '#9A6700', over: '#C4321F',
};

export const stage: typeof paper = {
  bg: '#000000', card: '#141414', fg: '#FFFFFF', muted: '#A6A6AB', line: '#2A2A2A', soft: '#141414',
  accent: '#FFD43B', accentFg: '#000000', mark: '#FFD43B', warn: '#FFD43B', over: '#FF7A66',
};

export type Theme = typeof paper;

/** Bible reading only. Sepia lowers the brightness in long readings. */
export const readingThemes = {
  paper: { bg: paper.bg, fg: paper.fg, muted: paper.muted, line: paper.line, select: '#FFE98A', markOpacity: 1 },
  sepia: { bg: '#F1E4CC', fg: '#2B2118', muted: '#8A7660', line: '#DCC9A6', select: '#E6B445', markOpacity: 1 },
  dark: { bg: '#15161A', fg: '#ECECEE', muted: '#9A9CA3', line: '#2C2D33', select: '#6B5A12', markOpacity: 0.42 },
};

/** Words being selected, before they get a category. */
export const selection = '#FFE98A';

/** Titles and scripture. The interface uses the system font. */
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

import type { Study, VerseSpan, VerseText } from '@preachfy/core';

export const TRANSLATION = 'kjv';
export const PASSAGE = 'Salmos 23';

const texts = [
  'The LORD is my shepherd; I shall not want.',
  'He maketh me to lie down in green pastures: he leadeth me beside the still waters.',
  'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.',
  'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.',
  'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.',
  'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.',
];

export const verses: VerseText[] = texts.map((text, i) => ({ ref: { book: 'sl', chapter: 23, verse: i + 1 }, text }));

const scripture = (from: number, to: number) => ({
  kind: 'scripture' as const,
  spans: verses.slice(from - 1, to).map((v): VerseSpan => ({ ref: v.ref, translationId: TRANSLATION })),
});

export const sampleStudy: Study = {
  id: 'sample',
  title: 'O Senhor é o meu pastor',
  context: scripture(1, 6),
  steps: [
    { id: '1', title: 'Quando parece que falta algo', plannedMs: 300_000,
      baseText: { kind: 'authored', text: 'O que você mais teme que falte nesta semana?' },
      notes: 'Deixe a pessoa pensar. Conte uma história curta de alguém que passou por falta e, mesmo assim, foi cuidado.' },
    { id: '2', title: 'Ele cuida de mim', plannedMs: 600_000, baseText: scripture(1, 3),
      notes: 'O pastor provê (v. 1), faz descansar (v. 2) e restaura (v. 3). Repare nos verbos: tudo o que o pastor faz, ele faz por mim.' },
    { id: '3', title: 'Ele está comigo no vale', plannedMs: 600_000, baseText: scripture(4, 4),
      notes: 'O salmista não diz que evita o vale. Diz que passa por ele, e que não está sozinho. A vara e o cajado: proteção e direção.' },
    { id: '4', title: 'Ele me recebe e me guarda', plannedMs: 600_000, baseText: scripture(5, 6),
      notes: 'Uma mesa preparada à vista dos inimigos: honra pública. Bondade e misericórdia me seguem.' },
    { id: '5', title: 'Confie no Pastor', plannedMs: 300_000,
      baseText: { kind: 'authored', text: 'Entregue isso ao Pastor hoje.' },
      notes: 'Volte à pergunta do início. Convide a uma resposta e termine com oração.' },
  ],
};

export function studyText(text: Study['context']): { label: string; body: string } | null {
  if (!text) return null;
  if (text.kind === 'authored') return { label: '', body: text.text };
  const numbers = text.spans.map((s) => s.ref.verse);
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  const range = first === last ? `${first}` : `${first}–${last}`;
  const body = text.spans.map((s) => verses[s.ref.verse - 1]?.text ?? '').join(' ');
  return { label: `${PASSAGE}:${range} · KJV`, body };
}

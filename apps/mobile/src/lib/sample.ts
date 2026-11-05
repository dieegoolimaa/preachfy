import type { Locale, Study, StudyText } from '@preachfy/core';

import { defaultTranslation } from './store';

const steps: Record<Locale, [string, string, string?][]> = {
  pt: [
    ['Quando parece que falta algo', 'Deixe a pessoa pensar. Conte uma história curta de alguém que passou por falta e, mesmo assim, foi cuidado.', 'O que você mais teme que falte nesta semana?'],
    ['Ele cuida de mim', 'O pastor provê (v. 1), faz descansar (v. 2) e restaura (v. 3). Repare nos verbos: tudo o que o pastor faz, ele faz por mim.'],
    ['Ele está comigo no vale', 'O salmista não diz que evita o vale. Diz que passa por ele, e que não está sozinho. A vara e o cajado: proteção e direção.'],
    ['Ele me recebe e me guarda', 'Uma mesa preparada à vista dos inimigos: honra pública. Bondade e misericórdia me seguem.'],
    ['Confie no Pastor', 'Volte à pergunta do início. Convide a uma resposta e termine com oração.', 'Entregue isso ao Pastor hoje.'],
  ],
  en: [
    ['When something seems to be missing', 'Let people think. Tell a short story of someone who went through lack and was still cared for.', 'What do you most fear will be missing this week?'],
    ['He takes care of me', 'The shepherd provides (v. 1), gives rest (v. 2) and restores (v. 3). Notice the verbs: all the shepherd does, he does for me.'],
    ['He is with me in the valley', 'The psalmist does not say he avoids the valley. He says he walks through it, and is not alone. Rod and staff: protection and direction.'],
    ['He welcomes and keeps me', 'A table prepared before enemies: public honor. Goodness and mercy follow me.'],
    ['Trust the Shepherd', 'Return to the opening question. Invite a response and end in prayer.', 'Give this to the Shepherd today.'],
  ],
  es: [
    ['Cuando parece que algo falta', 'Deja que la persona piense. Cuenta una historia breve de alguien que pasó necesidad y aun así fue cuidado.', '¿Qué es lo que más temes que falte esta semana?'],
    ['Él cuida de mí', 'El pastor provee (v. 1), hace descansar (v. 2) y restaura (v. 3). Fíjate en los verbos: todo lo que hace el pastor, lo hace por mí.'],
    ['Él está conmigo en el valle', 'El salmista no dice que evita el valle. Dice que pasa por él y que no está solo. La vara y el cayado: protección y dirección.'],
    ['Él me recibe y me guarda', 'Una mesa preparada ante los enemigos: honra pública. El bien y la misericordia me siguen.'],
    ['Confía en el Pastor', 'Vuelve a la pregunta del inicio. Invita a una respuesta y termina con oración.', 'Entrégale esto al Pastor hoy.'],
  ],
};

const titles: Record<Locale, string> = { pt: 'O Senhor é o meu pastor', en: 'The Lord is my shepherd', es: 'El Señor es mi pastor' };
const ranges: ([number, number] | null)[] = [null, [1, 3], [4, 4], [5, 6], null];
const minutes = [5, 10, 10, 10, 5];

/** A finished example, open to everyone, so people can try the Pulpit before subscribing. */
export function demoStudy(locale: Locale): Study {
  const translationId = defaultTranslation[locale];
  const scripture = (from: number, to: number): StudyText => ({
    kind: 'scripture',
    spans: Array.from({ length: to - from + 1 }, (_, i) => ({ ref: { book: 'PSA', chapter: 23, verse: from + i }, translationId })),
  });
  return {
    id: 'demo',
    title: titles[locale],
    kind: 'outline',
    passage: { book: 'PSA', chapter: 23, from: 1, to: 6, translationId },
    context: scripture(1, 6),
    steps: steps[locale].map(([title, notes, key], i) => {
      const range = ranges[i];
      return {
        id: String(i + 1), title, notes, plannedMs: minutes[i]! * 60_000,
        baseText: range ? scripture(range[0], range[1]) : { kind: 'authored', text: key! },
      };
    }),
  };
}

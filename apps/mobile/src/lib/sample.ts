import type { Block, Locale, Study, StudyText } from '@preachfy/core';

import { defaultTranslation } from './store';

type Copy = {
  title: string; theme: string;
  intro: { title: string; ideas: string[] };
  one: { ideas: string[]; illustration: string; bridge: string };
  two: { ideas: string[]; question: string; application: string };
  end: { title: string; ideas: string[]; prayer: string };
};

const copy: Record<Locale, Copy> = {
  pt: {
    title: 'Exemplo: O Senhor é o meu pastor (pode apagar)',
    theme: 'Deus cuida de quem confia nele.',
    intro: {
      title: 'Introdução',
      ideas: ['Esta é a Introdução: ela abre a mensagem e mostra o texto bíblico inteiro. Escreva aqui o que vai dizer antes dos passos. Exemplo: “Você já se sentiu sem rumo? Hoje vamos ver quem cuida de nós.”'],
    },
    one: {
      ideas: ['Cada passo tem um trecho do texto e a sua anotação. Neste, o trecho são os versículos 1 a 3: o Senhor é o meu pastor, e por isso nada me faltará. Ele provê, faz descansar e restaura.'],
      illustration: 'Uma ilustração conta uma cena. Exemplo: um pastor que conhece cada ovelha pelo nome e vai buscar a que se perdeu.',
      bridge: 'Mas e quando o caminho fica escuro?',
    },
    two: {
      ideas: ['O trecho agora é o versículo 4. A frase em itálico lá embaixo da tela, “A seguir”, é a ponte: ela liga um passo ao outro. Aqui: no vale o pastor não some, ele está comigo.'],
      question: 'Uma pergunta para a plateia pensar: qual é o seu “vale” agora?',
      application: 'Uma aplicação diz o que fazer com isso: nesta semana, entregue uma preocupação ao Pastor em oração.',
    },
    end: {
      title: 'Conclusão',
      ideas: ['A Conclusão fecha a mensagem: retome o tema e convide a uma resposta. Você está no Púlpito: cada passo é uma tela, com o texto bíblico e as suas anotações juntos. Use A− e A+ para o tamanho da letra e “Próximo passo” para avançar. Para fazer a sua mensagem, volte e toque em Preparar. Para apagar este exemplo, abra-o e use “Apagar” no fim da página.'],
      prayer: 'Senhor, tu és o meu pastor. Ensina-nos a confiar em ti. Amém.',
    },
  },
  en: {
    title: 'Example: The Lord is my shepherd (you can delete it)',
    theme: 'God cares for those who trust in him.',
    intro: {
      title: 'Introduction',
      ideas: ['This is the Introduction: it opens the message and shows the whole Bible text. Write here what you will say before the steps. Example: “Have you ever felt lost? Today we see who cares for us.”'],
    },
    one: {
      ideas: ['Each step has a part of the text and your note. Here the part is verses 1 to 3: the Lord is my shepherd, so I shall not want. He provides, gives rest and restores.'],
      illustration: 'An illustration tells a scene. Example: a shepherd who knows every sheep by name and goes after the one that wandered off.',
      bridge: 'But what when the road turns dark?',
    },
    two: {
      ideas: ['The part now is verse 4. The italic line near the bottom, “Up next”, is the bridge: it links one step to the next. Here: in the valley the shepherd does not vanish, he is with me.'],
      question: 'A question for the audience to think about: what is your “valley” right now?',
      application: 'An application says what to do with it: this week, hand one worry over to the Shepherd in prayer.',
    },
    end: {
      title: 'Conclusion',
      ideas: ['The Conclusion closes the message: return to the theme and invite a response. You are in the Pulpit: each step is one screen, with the Bible text and your notes together. Use A− and A+ for text size and “Next step” to move on. To make your own message, go back and tap Prepare. To remove this example, open it and use “Delete” at the end of the page.'],
      prayer: 'Lord, you are my shepherd. Teach us to trust you. Amen.',
    },
  },
  es: {
    title: 'Ejemplo: El Señor es mi pastor (puedes borrarlo)',
    theme: 'Dios cuida de quien confía en él.',
    intro: {
      title: 'Introducción',
      ideas: ['Esta es la Introducción: abre el mensaje y muestra todo el texto bíblico. Escribe aquí lo que dirás antes de los pasos. Ejemplo: “¿Alguna vez te has sentido sin rumbo? Hoy veremos quién cuida de nosotros.”'],
    },
    one: {
      ideas: ['Cada paso tiene un trozo del texto y tu nota. Aquí el trozo son los versículos 1 al 3: el Señor es mi pastor, por eso nada me faltará. Él provee, hace descansar y restaura.'],
      illustration: 'Una ilustración cuenta una escena. Ejemplo: un pastor que conoce a cada oveja por su nombre y va a buscar la que se perdió.',
      bridge: 'Pero ¿y cuando el camino se oscurece?',
    },
    two: {
      ideas: ['El trozo ahora es el versículo 4. La línea en cursiva cerca del final, “A continuación”, es el puente: une un paso con el siguiente. Aquí: en el valle el pastor no desaparece, está conmigo.'],
      question: 'Una pregunta para que el público piense: ¿cuál es tu “valle” ahora?',
      application: 'Una aplicación dice qué hacer con eso: esta semana, entrega una preocupación al Pastor en oración.',
    },
    end: {
      title: 'Conclusión',
      ideas: ['La Conclusión cierra el mensaje: retoma el tema e invita a una respuesta. Estás en el Púlpito: cada paso es una pantalla, con el texto bíblico y tus notas juntos. Usa A− y A+ para el tamaño de la letra y “Siguiente paso” para avanzar. Para hacer tu mensaje, vuelve y toca Preparar. Para borrar este ejemplo, ábrelo y usa “Borrar” al final de la página.'],
      prayer: 'Señor, tú eres mi pastor. Enséñanos a confiar en ti. Amén.',
    },
  },
};

/**
 * The sample message: it shows how a message is built (Bible text, introduction, steps, conclusion)
 * and how the Pulpit leads it. Everyone starts with one, and it can be deleted.
 */
export function exampleStudy(locale: Locale, id = 'demo', newId: () => string = () => Math.random().toString(36).slice(2)): Study {
  const translationId = defaultTranslation[locale];
  const c = copy[locale];
  const scripture = (from: number, to: number): StudyText => ({
    kind: 'scripture',
    spans: Array.from({ length: to - from + 1 }, (_, i) => ({ ref: { book: 'PSA', chapter: 23, verse: from + i }, translationId })),
  });
  const block = (kind: Block['kind'], text: string): Block => ({ id: newId(), kind, text });
  return {
    id,
    title: c.title,
    kind: 'outline',
    goal: c.theme,
    example: true,
    passage: { book: 'PSA', chapter: 23, from: 1, to: 6, translationId },
    targetMinutes: 20,
    steps: [
      { id: newId(), title: c.intro.title, role: 'intro', notes: '', plannedMs: 5 * 60_000, baseText: scripture(1, 6), blocks: c.intro.ideas.map((text) => block('idea', text)) },
      {
        id: newId(), title: '', notes: '', plannedMs: 5 * 60_000, baseText: scripture(1, 3), bridge: c.one.bridge,
        blocks: [block('idea', c.one.ideas[0]!), block('illustration', c.one.illustration)],
      },
      {
        id: newId(), title: '', notes: '', plannedMs: 5 * 60_000, baseText: scripture(4, 4),
        blocks: [block('idea', c.two.ideas[0]!), block('question', c.two.question), block('application', c.two.application)],
      },
      { id: newId(), title: c.end.title, role: 'conclusion', notes: '', plannedMs: 5 * 60_000, blocks: [block('idea', c.end.ideas[0]!), block('prayer', c.end.prayer)] },
    ],
  };
}

/** Open to everyone, so people can try the Pulpit before subscribing. */
export const demoStudy = (locale: Locale): Study => exampleStudy(locale, 'demo', (() => { let n = 0; return () => `demo-${n++}`; })());

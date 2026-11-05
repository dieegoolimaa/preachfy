import type { Locale } from './books.ts';
import { marksInPassage, passageText, captureSnapshot, type Mark, type Passage, type Step, type Study, type StudyKind } from './study.ts';

type Text = Record<Locale, string>;
/** Which part of the passage a section starts with. `part` splits it among those sections. */
type Range = 'all' | 'part' | 'opening';
export type TemplateSection = { title: Text; guidance: Text; minutes: number; feeds?: string[]; range?: Range; question?: boolean };
export type Template = { kind: StudyKind; name: Text; role: Text; goal?: Text; sections: TemplateSection[] };

const point = (n: number): TemplateSection => ({
  title: { pt: `Ponto ${n}`, en: `Point ${n}`, es: `Punto ${n}` },
  guidance: {
    pt: 'Uma afirmação curta. Leia o trecho, explique o que ele diz, ilustre e aplique.',
    en: 'One short statement. Read the passage, explain what it says, illustrate and apply.',
    es: 'Una afirmación breve. Lee el pasaje, explica lo que dice, ilustra y aplica.',
  },
  minutes: 10, feeds: ['significado', 'aplicacao'], range: 'part',
});

const idea = (n: number): TemplateSection => ({
  title: { pt: `Ideia ${n}`, en: `Idea ${n}`, es: `Idea ${n}` },
  guidance: {
    pt: 'Uma frase que a plateia vá lembrar. Depois, a prova da ideia.',
    en: 'One sentence the audience will remember. Then the proof of the idea.',
    es: 'Una frase que el público recuerde. Después, la prueba de la idea.',
  },
  minutes: 6,
});

export const TEMPLATES: Template[] = [
  {
    kind: 'outline',
    name: { pt: 'Esboço', en: 'Outline', es: 'Bosquejo' },
    role: { pt: 'Pregar', en: 'Preach', es: 'Predicar' },
    goal: { pt: 'Ideia central: a mensagem inteira em uma frase.', en: 'Central idea: the whole message in one sentence.', es: 'Idea central: todo el mensaje en una frase.' },
    sections: [
      {
        title: { pt: 'Introdução', en: 'Introduction', es: 'Introducción' },
        guidance: {
          pt: 'Abra com uma pergunta ou uma cena que leve a pessoa ao texto. Diga qual é o texto e qual é o tema.',
          en: 'Open with a question or a scene that leads people to the text. Say what the text and the theme are.',
          es: 'Abre con una pregunta o una escena que lleve a la persona al texto. Di cuál es el texto y el tema.',
        },
        minutes: 5, feeds: ['contexto'],
      },
      point(1), point(2), point(3),
      {
        title: { pt: 'Conclusão e apelo', en: 'Conclusion and appeal', es: 'Conclusión y llamado' },
        guidance: {
          pt: 'Retome a ideia central. Peça uma resposta concreta. Termine com oração.',
          en: 'Return to the central idea. Ask for a concrete response. End in prayer.',
          es: 'Retoma la idea central. Pide una respuesta concreta. Termina con oración.',
        },
        minutes: 5, feeds: ['aplicacao'],
      },
    ],
  },
  {
    kind: 'study',
    name: { pt: 'Estudo', en: 'Study', es: 'Estudio' },
    role: { pt: 'Estudar', en: 'Study', es: 'Estudiar' },
    sections: [
      {
        title: { pt: 'Contexto', en: 'Context', es: 'Contexto' },
        guidance: { pt: 'Quem escreveu, para quem, quando e por quê.', en: 'Who wrote it, to whom, when and why.', es: 'Quién escribió, para quién, cuándo y por qué.' },
        minutes: 10, feeds: ['contexto'],
      },
      {
        title: { pt: 'Observação', en: 'Observation', es: 'Observación' },
        guidance: { pt: 'O que o texto diz. Anote repetições, verbos e contrastes, verso a verso.', en: 'What the text says. Note repetitions, verbs and contrasts, verse by verse.', es: 'Lo que dice el texto. Anota repeticiones, verbos y contrastes, verso a verso.' },
        minutes: 10, feeds: ['significado'], range: 'all',
      },
      {
        title: { pt: 'Hermenêutica', en: 'Interpretation', es: 'Hermenéutica' },
        guidance: { pt: 'O que o texto queria dizer aos primeiros leitores.', en: 'What the text meant to its first readers.', es: 'Lo que el texto quería decir a sus primeros lectores.' },
        minutes: 10, feeds: ['revelacao'], range: 'all',
      },
      {
        title: { pt: 'Correlações', en: 'Cross-references', es: 'Correlaciones' },
        guidance: { pt: 'Outros textos que esclarecem este.', en: 'Other texts that shed light on this one.', es: 'Otros textos que aclaran este.' },
        minutes: 10, feeds: ['cristo', 'promessa'],
      },
      {
        title: { pt: 'Aplicação', en: 'Application', es: 'Aplicación' },
        guidance: { pt: 'O que muda na vida, na igreja, na semana.', en: 'What changes in life, in the church, this week.', es: 'Qué cambia en la vida, en la iglesia, en la semana.' },
        minutes: 10, feeds: ['aplicacao', 'vida'],
      },
      {
        title: { pt: 'Perguntas para reflexão', en: 'Questions for reflection', es: 'Preguntas para reflexionar' },
        guidance: { pt: 'Duas ou três perguntas para continuar pensando.', en: 'Two or three questions to keep thinking.', es: 'Dos o tres preguntas para seguir pensando.' },
        minutes: 5, question: true,
      },
    ],
  },
  {
    kind: 'devotional',
    name: { pt: 'Devocional', en: 'Devotional', es: 'Devocional' },
    role: { pt: 'Meditar e compartilhar', en: 'Meditate and share', es: 'Meditar y compartir' },
    sections: [
      {
        title: { pt: 'Versículo', en: 'Verse', es: 'Versículo' },
        guidance: { pt: 'O texto do dia, de um a três versículos.', en: 'The text for the day, one to three verses.', es: 'El texto del día, de uno a tres versículos.' },
        minutes: 2, feeds: ['promessa', 'vida'], range: 'opening',
      },
      {
        title: { pt: 'Reflexão', en: 'Reflection', es: 'Reflexión' },
        guidance: { pt: 'De três a cinco frases: o que isto diz sobre Deus e sobre mim?', en: 'Three to five sentences: what does this say about God and about me?', es: 'De tres a cinco frases: ¿qué dice esto sobre Dios y sobre mí?' },
        minutes: 3, feeds: ['revelacao', 'cristo'],
      },
      {
        title: { pt: 'Aplicação', en: 'Application', es: 'Aplicación' },
        guidance: { pt: 'Uma frase que começa com "Hoje eu vou…".', en: 'One sentence that begins with "Today I will…".', es: 'Una frase que empieza con "Hoy voy a…".' },
        minutes: 1, feeds: ['aplicacao'],
      },
      {
        title: { pt: 'Oração', en: 'Prayer', es: 'Oración' },
        guidance: { pt: 'Uma oração curta, com as suas palavras.', en: 'A short prayer, in your own words.', es: 'Una oración breve, con tus palabras.' },
        minutes: 2,
      },
      {
        title: { pt: 'Pergunta do dia', en: 'Question of the day', es: 'Pregunta del día' },
        guidance: { pt: 'Algo para levar no coração até a noite.', en: 'Something to carry in your heart until evening.', es: 'Algo para llevar en el corazón hasta la noche.' },
        minutes: 1, question: true,
      },
    ],
  },
  {
    kind: 'class',
    name: { pt: 'Aula', en: 'Class', es: 'Clase' },
    role: { pt: 'Ensinar', en: 'Teach', es: 'Enseñar' },
    goal: { pt: 'Objetivo da aula: o que a turma deve sair sabendo ou fazendo.', en: 'Class goal: what the group should leave knowing or doing.', es: 'Objetivo de la clase: lo que el grupo debe saber o hacer al salir.' },
    sections: [
      {
        title: { pt: 'Quebra-gelo', en: 'Icebreaker', es: 'Rompehielos' },
        guidance: { pt: 'Uma pergunta que abra a conversa. Deixe duas ou três pessoas responderem.', en: 'A question that opens the conversation. Let two or three people answer.', es: 'Una pregunta que abra la conversación. Deja que dos o tres personas respondan.' },
        minutes: 5, question: true,
      },
      {
        title: { pt: 'Leitura em grupo', en: 'Group reading', es: 'Lectura en grupo' },
        guidance: { pt: 'Peça a um voluntário que leia. Leia uma segunda vez em silêncio.', en: 'Ask a volunteer to read. Read a second time in silence.', es: 'Pide a un voluntario que lea. Lee una segunda vez en silencio.' },
        minutes: 5, range: 'all',
      },
      {
        title: { pt: 'Observação', en: 'Observation', es: 'Observación' },
        guidance: { pt: 'O que o texto diz? Faça perguntas e espere. Conte até dez antes de ajudar.', en: 'What does the text say? Ask and wait. Count to ten before helping.', es: '¿Qué dice el texto? Pregunta y espera. Cuenta hasta diez antes de ayudar.' },
        minutes: 10, feeds: ['significado'], range: 'all', question: true,
      },
      {
        title: { pt: 'Contexto', en: 'Context', es: 'Contexto' },
        guidance: { pt: 'O pano de fundo do texto, em poucas frases.', en: 'The background of the text, in a few sentences.', es: 'El trasfondo del texto, en pocas frases.' },
        minutes: 10, feeds: ['contexto'],
      },
      {
        title: { pt: 'Atividade', en: 'Activity', es: 'Actividad' },
        guidance: { pt: 'Em duplas ou grupos, com tempo marcado.', en: 'In pairs or groups, with a set time.', es: 'En parejas o grupos, con tiempo marcado.' },
        minutes: 10, feeds: ['aplicacao'], question: true,
      },
      {
        title: { pt: 'Aplicação e desafio', en: 'Application and challenge', es: 'Aplicación y desafío' },
        guidance: { pt: 'Um passo concreto para a semana, com dia e hora. Feche com oração.', en: 'One concrete step for the week, with a day and time. Close in prayer.', es: 'Un paso concreto para la semana, con día y hora. Cierra con oración.' },
        minutes: 10, feeds: ['aplicacao', 'vida'],
      },
    ],
  },
  {
    kind: 'talk',
    name: { pt: 'Palestra', en: 'Talk', es: 'Charla' },
    role: { pt: 'Falar', en: 'Speak', es: 'Hablar' },
    goal: { pt: 'Ideia central: a mensagem inteira em uma frase.', en: 'Central idea: the whole message in one sentence.', es: 'Idea central: todo el mensaje en una frase.' },
    sections: [
      {
        title: { pt: 'Abertura', en: 'Opening', es: 'Apertura' },
        guidance: { pt: 'Uma pergunta ou uma cena. Nada de explicar o plano da fala ainda.', en: 'A question or a scene. Do not explain the plan of the talk yet.', es: 'Una pregunta o una escena. No expliques todavía el plan de la charla.' },
        minutes: 3,
      },
      idea(1), idea(2),
      {
        title: { pt: 'História', en: 'Story', es: 'Historia' },
        guidance: { pt: 'Uma história curta que sustente a mensagem.', en: 'A short story that supports the message.', es: 'Una historia breve que sostenga el mensaje.' },
        minutes: 3,
      },
      {
        title: { pt: 'Texto de apoio', en: 'Supporting text', es: 'Texto de apoyo' },
        guidance: { pt: 'Um trecho bíblico que sustente a mensagem. Pode ser retirado.', en: 'A Bible passage that supports the message. It can be removed.', es: 'Un pasaje bíblico que sostenga el mensaje. Se puede quitar.' },
        minutes: 2, feeds: ['promessa'], range: 'all',
      },
      {
        title: { pt: 'Fechamento', en: 'Closing', es: 'Cierre' },
        guidance: { pt: 'O convite final, em uma frase.', en: 'The final invitation, in one sentence.', es: 'La invitación final, en una frase.' },
        minutes: 2, feeds: ['aplicacao'],
      },
    ],
  },
];

export const templateFor = (kind: StudyKind) => TEMPLATES.find((t) => t.kind === kind)!;

/** Splits verses from..to into `parts` runs, as evenly as possible. */
export function splitRange(from: number, to: number, parts: number): [number, number][] {
  const total = to - from + 1;
  const count = Math.min(parts, total);
  const size = Math.floor(total / count);
  const extra = total % count;
  const runs: [number, number][] = [];
  let at = from;
  for (let i = 0; i < count; i++) {
    const length = size + (i < extra ? 1 : 0);
    runs.push([at, at + length - 1]);
    at += length;
  }
  return runs;
}

type NewStudy = { id: string; kind: StudyKind; title: string; passage?: Passage; marks: Mark[]; locale: Locale; now: number; newId: () => string };

/** The template suggests and the author decides: every step can be changed afterwards. */
export function buildStudy({ id, kind, title, passage, marks, locale, now, newId }: NewStudy): Study {
  const { sections } = templateFor(kind);
  const parts = passage ? splitRange(passage.from, passage.to, sections.filter((s) => s.range === 'part').length || 1) : [];
  let nextPart = 0;
  const steps = sections.map((section): Step => {
    const step: Step = {
      id: newId(),
      title: section.title[locale],
      guidance: section.guidance[locale],
      notes: '',
      plannedMs: section.minutes * 60_000,
      ...(section.feeds ? { feeds: section.feeds } : {}),
    };
    if (!passage || !section.range) return step;
    if (section.range === 'all') step.baseText = passageText(passage);
    if (section.range === 'opening') step.baseText = passageText(passage, passage.from, Math.min(passage.to, passage.from + 2));
    if (section.range === 'part') {
      const run = parts[nextPart++];
      if (run) step.baseText = passageText(passage, run[0], run[1]);
    }
    return step;
  });
  return {
    id, title, kind, steps, createdAt: now, updatedAt: now,
    ...(passage ? { passage, context: passageText(passage), snapshot: captureSnapshot(id, marksInPassage(marks, passage), now, newId) } : {}),
  };
}

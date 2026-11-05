import type { Locale } from '@preachfy/core';
import { getLocales } from 'expo-localization';

import { useReader } from './store';

const pt = {
  search: 'Buscar', pulpit: 'Púlpito', clean: 'Limpo', about: 'Sobre', previous: '← Anterior', next: 'Próximo →',
  copy: 'Copiar', share: 'Compartilhar', cancel: 'Cancelar', close: 'Fechar', back: 'Voltar',
  opening: 'Abrindo…', openFailed: 'Não foi possível abrir este livro.',
  tapStart: 'Toque em uma palavra para começar.', tapEnd: 'Toque em outra palavra para fechar o trecho.',
  markSaved: 'Destaque salvo', copied: 'Copiado', copiedToShare: 'Copiado para compartilhar',
  widenedOne: '1 marcação aparece no versículo inteiro nesta versão.',
  widenedMany: '{n} marcações aparecem no versículo inteiro nesta versão.',
  books: 'Livros', searchHint: 'Palavra ou referência (jo 3 16)', searching: 'Buscando…', nothing: 'Nada encontrado.',
  results: '{n} resultados', first100: 'Primeiros 100 resultados',
  aboutTitle: 'Sobre e licenças', language: 'Idioma', exit: 'Sair', pause: 'Pausar', resume: 'Retomar',
  context: 'Contexto', light: 'Claro', stage: 'Palco', stepOf: 'Passo {i} de {n}', upNext: 'A seguir: {title}',
  onPace: 'No ritmo', behind: '{time} atrás', ahead: '{time} adiantado', inStep: 'neste passo {time}',
  catpromessa: 'Promessa', catmandamento: 'Mandamento', cataplicacao: 'Aplicação', catcristo: 'Cristo',
  catrevelacao: 'Revelação', catcontexto: 'Contexto', catvida: 'Vida', catsignificado: 'Significado',
};

type Key = keyof typeof pt;

const en: Record<Key, string> = {
  search: 'Search', pulpit: 'Pulpit', clean: 'Clean', about: 'About', previous: '← Previous', next: 'Next →',
  copy: 'Copy', share: 'Share', cancel: 'Cancel', close: 'Close', back: 'Back',
  opening: 'Opening…', openFailed: 'This book could not be opened.',
  tapStart: 'Tap a word to begin.', tapEnd: 'Tap another word to close the selection.',
  markSaved: 'Highlight saved', copied: 'Copied', copiedToShare: 'Copied to share',
  widenedOne: '1 highlight covers the whole verse in this version.',
  widenedMany: '{n} highlights cover the whole verse in this version.',
  books: 'Books', searchHint: 'Word or reference (john 3 16)', searching: 'Searching…', nothing: 'Nothing found.',
  results: '{n} results', first100: 'First 100 results',
  aboutTitle: 'About and licenses', language: 'Language', exit: 'Exit', pause: 'Pause', resume: 'Resume',
  context: 'Context', light: 'Light', stage: 'Stage', stepOf: 'Step {i} of {n}', upNext: 'Up next: {title}',
  onPace: 'On pace', behind: '{time} behind', ahead: '{time} ahead', inStep: 'this step {time}',
  catpromessa: 'Promise', catmandamento: 'Command', cataplicacao: 'Application', catcristo: 'Christ',
  catrevelacao: 'Revelation', catcontexto: 'Context', catvida: 'Life', catsignificado: 'Meaning',
};

const es: Record<Key, string> = {
  search: 'Buscar', pulpit: 'Púlpito', clean: 'Limpio', about: 'Acerca de', previous: '← Anterior', next: 'Siguiente →',
  copy: 'Copiar', share: 'Compartir', cancel: 'Cancelar', close: 'Cerrar', back: 'Volver',
  opening: 'Abriendo…', openFailed: 'No se pudo abrir este libro.',
  tapStart: 'Toca una palabra para empezar.', tapEnd: 'Toca otra palabra para cerrar la selección.',
  markSaved: 'Resaltado guardado', copied: 'Copiado', copiedToShare: 'Copiado para compartir',
  widenedOne: '1 resaltado cubre todo el versículo en esta versión.',
  widenedMany: '{n} resaltados cubren todo el versículo en esta versión.',
  books: 'Libros', searchHint: 'Palabra o referencia (juan 3 16)', searching: 'Buscando…', nothing: 'No se encontró nada.',
  results: '{n} resultados', first100: 'Primeros 100 resultados',
  aboutTitle: 'Acerca de y licencias', language: 'Idioma', exit: 'Salir', pause: 'Pausar', resume: 'Reanudar',
  context: 'Contexto', light: 'Claro', stage: 'Escenario', stepOf: 'Paso {i} de {n}', upNext: 'A continuación: {title}',
  onPace: 'A buen ritmo', behind: '{time} de retraso', ahead: '{time} de adelanto', inStep: 'en este paso {time}',
  catpromessa: 'Promesa', catmandamento: 'Mandamiento', cataplicacao: 'Aplicación', catcristo: 'Cristo',
  catrevelacao: 'Revelación', catcontexto: 'Contexto', catvida: 'Vida', catsignificado: 'Significado',
};

const dictionaries: Record<Locale, Record<Key, string>> = { pt, en, es };

export const localeNames: Record<Locale, string> = { pt: 'Português', en: 'English', es: 'Español' };
export const locales = Object.keys(localeNames) as Locale[];

export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'pt' || code === 'es' ? code : 'en';
}

export function useT() {
  const { locale } = useReader();
  const t = (key: Key, values: Record<string, string | number> = {}) =>
    dictionaries[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
  return { t, locale };
}

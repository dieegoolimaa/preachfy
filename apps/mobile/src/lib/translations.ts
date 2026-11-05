export type Translation = {
  id: string;
  name: string;
  short: string;
  language: string;
  credit: string;
  url?: string;
};

export const translations: Translation[] = [
  {
    id: 'blivre',
    name: 'Bíblia Livre',
    short: 'BLIVRE',
    language: 'Português',
    credit:
      'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio e Marco Teles, fevereiro de 2018. Licença Creative Commons Atribuição. Texto adaptado: sem notas e sem colchetes.',
    url: 'https://creativecommons.org/licenses/by/3.0/br/',
  },
  {
    id: 'alm1911',
    name: 'Almeida 1911',
    short: 'ALM',
    language: 'Português, grafia de 1911',
    credit:
      'A Bíblia Sagrada, tradução de João Ferreira d’Almeida, edição revista e corrigida de 1911. Domínio público. Texto sem notas nem títulos dos salmos.',
  },
  {
    id: 'kjv',
    name: 'King James Version',
    short: 'KJV',
    language: 'English',
    credit: 'King James Version. Domínio público fora do Reino Unido. Texto via eBible.org e CrossWire.',
  },
];

export const translationById = (id: string) => translations.find((t) => t.id === id) ?? translations[0]!;

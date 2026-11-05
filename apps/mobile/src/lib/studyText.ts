import { bookName, type Locale, type Study, type StudyText } from '@preachfy/core';
import { useEffect, useState } from 'react';

import { loadBook } from './bible';
import { translationById } from './translations';

export type Rendered = { label: string; body: string };

/** Turns a study text into words on screen. Scripture comes from the bundled Bibles, so it works offline. */
export async function renderText(text: StudyText | undefined, locale: Locale): Promise<Rendered | null> {
  if (!text) return null;
  if (text.kind === 'authored') return { label: '', body: text.text };
  const first = text.spans[0];
  const last = text.spans[text.spans.length - 1];
  if (!first || !last) return null;
  const parts = await Promise.all(
    text.spans.map(async (span) => {
      const chapters = await loadBook(span.translationId, span.ref.book);
      return span.quote ?? chapters[span.ref.chapter - 1]?.[span.ref.verse - 1] ?? '';
    }),
  );
  const { book, chapter, verse } = first.ref;
  const range = verse === last.ref.verse ? `${verse}` : `${verse}–${last.ref.verse}`;
  return { label: `${bookName(book, locale)} ${chapter}:${range} · ${translationById(first.translationId).short}`, body: parts.join(' ') };
}

export function useRendered(text: StudyText | undefined, locale: Locale) {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  useEffect(() => {
    let live = true;
    renderText(text, locale).then((value) => live && setRendered(value), () => live && setRendered(null));
    return () => {
      live = false;
    };
  }, [text, locale]);
  return rendered;
}

/** Everything the Pulpit shows, loaded before it starts. */
export async function renderStudy(study: Study, locale: Locale) {
  const steps = await Promise.all(study.steps.map((step) => renderText(step.baseText, locale)));
  return { steps, context: await renderText(study.context, locale) };
}

import { parsePassage, type Locale, type Passage } from '@preachfy/core';

import { loadBook } from './bible';

/** Reads what was typed and checks it against the real chapter. Without verses, it takes the whole chapter. */
export async function resolvePassage(input: string, locale: Locale, translationId: string): Promise<Passage | null> {
  const parsed = parsePassage(input, locale);
  if (!parsed) return null;
  try {
    const chapters = await loadBook(translationId, parsed.book);
    const count = chapters[parsed.chapter - 1]?.length ?? 0;
    const from = parsed.verse ?? 1;
    const to = Math.min(parsed.to ?? parsed.verse ?? count, count);
    return count > 0 && from <= to ? { book: parsed.book, chapter: parsed.chapter, from, to, translationId } : null;
  } catch {
    return null;
  }
}

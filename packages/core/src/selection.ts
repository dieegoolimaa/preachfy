import type { VerseRef, VerseSpan } from './study.ts';

export type Word = { text: string; start: number; end: number };
export type VerseText = { ref: VerseRef; text: string };
export type WordPoint = { verseIndex: number; wordIndex: number };

export function wordsOf(text: string): Word[] {
  return [...text.matchAll(/[^\s.,;:!?()"“”]+/g)].map((m) => ({
    text: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
}

/** Turns two tapped words, in either order, into one span per verse. */
export function selectionSpans(verses: VerseText[], translationId: string, a: WordPoint, b: WordPoint): VerseSpan[] {
  const aFirst = a.verseIndex < b.verseIndex || (a.verseIndex === b.verseIndex && a.wordIndex <= b.wordIndex);
  const [from, to] = aFirst ? [a, b] : [b, a];
  const spans: VerseSpan[] = [];
  for (let i = from.verseIndex; i <= to.verseIndex; i++) {
    const verse = verses[i];
    if (!verse) continue;
    const words = wordsOf(verse.text);
    const first = words[i === from.verseIndex ? from.wordIndex : 0];
    const last = words[i === to.verseIndex ? to.wordIndex : words.length - 1];
    if (!first || !last) continue;
    spans.push({
      ref: verse.ref,
      translationId,
      start: first.start,
      end: last.end,
      quote: verse.text.slice(first.start, last.end),
    });
  }
  return spans;
}

import { BOOKS } from './books.ts';

export const PLAN_DAYS = 365;

export type PlanChapter = { book: string; chapter: number };

const everyChapter: PlanChapter[] = BOOKS.flatMap((book) =>
  Array.from({ length: book.chapters }, (_, i) => ({ book: book.id, chapter: i + 1 })),
);

/** The whole Bible in a year, three or four chapters a day. */
export function planChapters(day: number): PlanChapter[] {
  const from = Math.floor((day * everyChapter.length) / PLAN_DAYS);
  const to = Math.floor(((day + 1) * everyChapter.length) / PLAN_DAYS);
  return everyChapter.slice(from, to);
}

const midnight = (at: number) => new Date(at).setHours(0, 0, 0, 0);

/** Counts calendar days, so reading late at night does not skip a day. */
export function planDayOf(startedAt: number, now: number): number {
  const days = Math.round((midnight(now) - midnight(startedAt)) / 86_400_000);
  return Math.min(Math.max(days, 0), PLAN_DAYS - 1);
}

export const planProgress = (done: number[]) => new Set(done).size / PLAN_DAYS;

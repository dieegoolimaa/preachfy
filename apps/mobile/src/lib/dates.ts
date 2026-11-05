import type { Locale } from '@preachfy/core';

const tags: Record<Locale, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

export const dateTime = (at: number, locale: Locale) =>
  new Date(at).toLocaleString(tags[locale], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const two = (n: number) => String(n).padStart(2, '0');

/** A plain typed format, the same on every device: 2026-11-08 19:30. */
export function toInput(at: number | undefined) {
  if (at === undefined) return '';
  const d = new Date(at);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export function fromInput(value: string): number | undefined {
  const m = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return undefined;
  const [, y, mo, d, h = '0', mi = '0'] = m;
  const at = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return at.getMonth() === Number(mo) - 1 && at.getDate() === Number(d) ? at.getTime() : undefined;
}

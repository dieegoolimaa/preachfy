import { exampleStudy } from './sample';
import { newId } from './ids';
import { getReader, saveStudy, updateReader } from './store';

/** A new install starts with a sample message to read, change, preach or delete. */
export function seedExample(force = false) {
  const { exampleSeeded, studies, locale } = getReader();
  if (!force && (exampleSeeded || studies.some((s) => !s.deletedAt))) return;
  saveStudy(exampleStudy(locale, newId(), newId));
  updateReader({ exampleSeeded: true });
}

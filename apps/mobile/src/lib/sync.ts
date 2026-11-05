import { itemsToPush, mergeItems, type Mark, type PulpitRun, type Study } from '@preachfy/core';

import { apiFetch } from './auth';
import { getReader, updateReader } from './store';

type Remote = { kind: string; id: string; updatedAt: number; data: unknown };

let running = false;

const outgoing = <T extends { id: string; updatedAt?: number }>(kind: string, items: T[], pushedAt: number) =>
  itemsToPush(items, pushedAt).map((data) => ({ kind, id: data.id, updatedAt: data.updatedAt ?? 1, data }));

const ofKind = <T>(items: Remote[], kind: string) =>
  items.filter((i) => i.kind === kind).map((i) => ({ ...(i.data as T), updatedAt: i.updatedAt }));

/** Sends local changes and applies remote ones. Reading, writing and preaching never wait for this. */
export async function syncAll(userId: string) {
  if (running) return;
  running = true;
  try {
    const reader = getReader();
    const fresh = reader.syncUser !== userId;
    let cursor = fresh ? 0 : reader.syncCursor;
    const pushedAt = fresh ? 0 : reader.syncPushedAt;
    const startedAt = Date.now();
    const pending = [
      ...outgoing('mark', reader.marks, pushedAt),
      ...outgoing('study', reader.studies, pushedAt),
      ...outgoing('run', reader.runs, pushedAt),
    ];
    let hasMore = true;
    let sent = 0;
    while (hasMore || sent < pending.length) {
      const items = pending.slice(sent, sent + 200);
      sent += items.length;
      const response = await apiFetch('/sync', { method: 'POST', body: JSON.stringify({ since: cursor, items }) });
      if (!response.ok) return;
      const body = (await response.json()) as { cursor: number; hasMore: boolean; items: Remote[] };
      const now = getReader();
      updateReader({
        marks: mergeItems(now.marks, ofKind<Mark>(body.items, 'mark')),
        studies: mergeItems(now.studies, ofKind<Study>(body.items, 'study')),
        runs: mergeItems(now.runs, ofKind<PulpitRun>(body.items, 'run')),
      });
      cursor = body.cursor;
      hasMore = body.hasMore;
    }
    updateReader({ syncUser: userId, syncCursor: cursor, syncPushedAt: startedAt });
  } catch {
    // Offline: the next sync sends the same changes.
  } finally {
    running = false;
  }
}

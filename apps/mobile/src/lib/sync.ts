import { marksToPush, mergeMarks, type Mark } from '@preachfy/core';

import { apiFetch } from './auth';
import { getReader, updateReader } from './store';

type Remote = { id: string; updatedAt: number; data: Mark };

let running = false;

/** Sends local changes and applies remote ones. Reading and marking never wait for this. */
export async function syncMarks(userId: string) {
  if (running) return;
  running = true;
  try {
    const reader = getReader();
    const fresh = reader.syncUser !== userId;
    let cursor = fresh ? 0 : reader.syncCursor;
    const pushedAt = fresh ? 0 : reader.syncPushedAt;
    const startedAt = Date.now();
    let items = marksToPush(reader.marks, pushedAt).map((data) => ({
      kind: 'mark',
      id: data.id,
      updatedAt: data.updatedAt ?? 1,
      data,
    }));
    let hasMore = true;
    while (hasMore) {
      const response = await apiFetch('/sync', { method: 'POST', body: JSON.stringify({ since: cursor, items }) });
      if (!response.ok) return;
      const body = (await response.json()) as { cursor: number; hasMore: boolean; items: Remote[] };
      const incoming = body.items.map((item) => ({ ...item.data, updatedAt: item.updatedAt }));
      updateReader({ marks: mergeMarks(getReader().marks, incoming) });
      cursor = body.cursor;
      hasMore = body.hasMore;
      items = [];
    }
    updateReader({ syncUser: userId, syncCursor: cursor, syncPushedAt: startedAt });
  } catch {
    // Offline: the next sync sends the same changes.
  } finally {
    running = false;
  }
}

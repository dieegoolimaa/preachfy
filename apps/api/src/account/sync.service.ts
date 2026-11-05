import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { db } from './auth';

const KINDS = ['mark'];
const MAX_ITEMS = 500;
const MAX_ITEM_BYTES = 32_000;
const PAGE = 1000;

export type SyncItem = { kind: string; id: string; updatedAt: number; data: unknown };
type Stored = { userId: string; kind: string; itemId: string; updatedAt: number; serverAt: number; data: unknown };

@Injectable()
export class SyncService implements OnModuleInit {
  private items = () => db().collection<Stored>('syncItems');

  async onModuleInit() {
    await this.items().createIndex({ userId: 1, kind: 1, itemId: 1 }, { unique: true });
    await this.items().createIndex({ userId: 1, serverAt: 1 });
    await db().collection('entitlements').createIndex({ userId: 1 }, { unique: true });
  }

  private validate(items: unknown): SyncItem[] {
    if (!Array.isArray(items) || items.length > MAX_ITEMS) throw new BadRequestException('Invalid items');
    for (const item of items as SyncItem[]) {
      const valid =
        KINDS.includes(item?.kind) &&
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        item.id.length <= 100 &&
        Number.isFinite(item.updatedAt) &&
        JSON.stringify(item.data ?? null).length <= MAX_ITEM_BYTES;
      if (!valid) throw new BadRequestException('Invalid item');
    }
    return items as SyncItem[];
  }

  /** The most recent edit wins, per item. A duplicate key means the stored copy is newer. */
  private async push(userId: string, items: SyncItem[], now: number) {
    if (items.length === 0) return;
    try {
      await this.items().bulkWrite(
        items.map(({ kind, id, updatedAt, data }) => {
          // A device clock in the future must not make an edit unbeatable.
          const stamp = Math.min(updatedAt, now);
          return {
            updateOne: {
              filter: { userId, kind, itemId: id, updatedAt: { $lt: stamp } },
              update: { $set: { updatedAt: stamp, serverAt: now, data } },
              upsert: true,
            },
          };
        }),
        { ordered: false },
      );
    } catch (error) {
      const failures = (error as { writeErrors?: { code: number }[] }).writeErrors ?? [];
      if (failures.length === 0 || failures.some((failure) => failure.code !== 11000)) throw error;
    }
  }

  async sync(userId: string, since: unknown, rawItems: unknown) {
    const items = this.validate(rawItems);
    const from = typeof since === 'number' && Number.isFinite(since) ? since : 0;
    const now = Date.now();
    await this.push(userId, items, now);
    const page = await this.items()
      .find({ userId, serverAt: { $gte: from } })
      .sort({ serverAt: 1 })
      .limit(PAGE)
      .toArray();
    const last = page[page.length - 1];
    return {
      cursor: page.length === PAGE && last ? last.serverAt : now,
      hasMore: page.length === PAGE,
      items: page.map(({ kind, itemId, updatedAt, data }) => ({ kind, id: itemId, updatedAt, data })),
    };
  }
}

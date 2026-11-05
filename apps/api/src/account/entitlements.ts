import { db } from './auth';

const ENTITLEMENT = 'pro';

const apiUrl = () => process.env.REVENUECAT_API_URL ?? 'https://api.revenuecat.com';
const headers = () => ({ Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` });
const subscriberUrl = (userId: string) => `${apiUrl()}/v1/subscribers/${encodeURIComponent(userId)}`;

type Stored = { userId: string; active: boolean; expiresAt: number | null };

/** Reads the real state from RevenueCat, so repeated or reordered webhooks cannot corrupt it. */
export async function refreshEntitlement(userId: string): Promise<void> {
  const response = await fetch(subscriberUrl(userId), { headers: headers() });
  if (!response.ok) throw new Error(`RevenueCat answered ${response.status}`);
  const body = (await response.json()) as {
    subscriber?: {
      entitlements?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null }>;
    };
  };
  const found = body.subscriber?.entitlements?.[ENTITLEMENT];
  const end = found?.grace_period_expires_date ?? found?.expires_date ?? null;
  await db()
    .collection<Stored>('entitlements')
    .updateOne(
      { userId },
      { $set: { active: Boolean(found), expiresAt: end ? new Date(end).getTime() : null } },
      { upsert: true },
    );
}

export async function readEntitlement(userId: string, now = Date.now()) {
  const stored = await db().collection<Stored>('entitlements').findOne({ userId });
  const pro = Boolean(stored?.active && (stored.expiresAt === null || stored.expiresAt > now));
  return { pro, expiresAt: stored?.expiresAt ?? null };
}

export async function deleteSubscriber(userId: string): Promise<void> {
  if (!process.env.REVENUECAT_SECRET_KEY) return;
  await fetch(subscriberUrl(userId), { method: 'DELETE', headers: headers() });
}

import { apiFetch } from './auth';

export type Community = { id: string; name: string; description: string; role: 'leader' | 'member'; memberCount: number };
export type Member = { userId: string; name: string; role: 'leader' | 'member'; isOwner: boolean };
export type Detail = {
  id: string; name: string; description: string; meetLink: string | null; role: 'leader' | 'member';
  isOwner: boolean; inviteCode: string | null; members: Member[];
};
export type Post = {
  id: string; authorId: string; authorName: string; kind: 'post' | 'notice'; text: string; createdAt: number;
  attachment: { title: string; study: unknown } | null; seenCount: number; seenByMe: boolean; mine: boolean;
  replyTo: string | null; amenCount: number; amenByMe: boolean;
};
export type CommunityEvent = {
  id: string; title: string; description: string; startsAt: number; place: string | null; meetLink: string | null;
  goingCount: number; goingByMe: boolean;
};

/** Returns the body, or null when the request failed. */
export async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T | null> {
  try {
    const response = await apiFetch(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) return null;
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return null;
  }
}

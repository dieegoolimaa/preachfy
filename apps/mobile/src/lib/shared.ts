import type { Study } from '@preachfy/core';

/** Studies shared in a community, opened in the Pulpit without being copied. They live only while the app runs. */
const shared = new Map<string, Study>();

export const sharedId = (postId: string) => `shared-${postId}`;
export const isShared = (id: string) => id.startsWith('shared-');
export const setShared = (id: string, study: Study) => void shared.set(id, study);
export const getShared = (id: string) => shared.get(id);

import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '../database';

type Role = 'leader' | 'member';
type Community = { _id: string; name: string; description: string; ownerId: string; inviteCode: string; meetLink?: string; createdAt: number };
type Member = { communityId: string; userId: string; name: string; role: Role; joinedAt: number };
type Post = {
  _id: string; communityId: string; authorId: string; authorName: string; kind: 'post' | 'notice'; text: string;
  attachment?: { title: string; study: unknown }; seenBy: string[]; createdAt: number;
};
type Event = {
  _id: string; communityId: string; title: string; description: string; startsAt: number;
  place?: string; meetLink?: string; going: string[]; createdBy: string;
};
type Actor = { id: string; name: string };

const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const FEED_PAGE = 50;
const MAX_ATTACHMENT_BYTES = 256_000;

const newInvite = () => [...randomBytes(10)].map((byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join('');

function text(value: unknown, max: number, required = true): string {
  const clean = typeof value === 'string' ? value.trim() : '';
  if ((required && !clean) || clean.length > max) throw new BadRequestException('Invalid text');
  return clean;
}

/** Links open on other people's devices, so only web addresses are accepted. */
function webLink(value: unknown): string | undefined {
  const clean = text(value, 500, false);
  if (!clean) return undefined;
  if (!/^https?:\/\/\S+$/i.test(clean)) throw new BadRequestException('Invalid link');
  return clean;
}

const communities = () => db().collection<Community>('communities');
const members = () => db().collection<Member>('communityMembers');
const posts = () => db().collection<Post>('communityPosts');
const events = () => db().collection<Event>('communityEvents');
const reports = () => db().collection('communityReports');
const blocks = () => db().collection<{ userId: string; blockedId: string }>('userBlocks');

/** Removes what belongs to a deleted account. Communities it owns go with it. */
export async function deleteCommunityData(userId: string) {
  const owned = await communities().find({ ownerId: userId }).project({ _id: 1 }).toArray();
  const ids = owned.map((c) => c._id as string);
  await Promise.all([
    communities().deleteMany({ _id: { $in: ids } }),
    members().deleteMany({ $or: [{ communityId: { $in: ids } }, { userId }] }),
    posts().deleteMany({ $or: [{ communityId: { $in: ids } }, { authorId: userId }] }),
    events().deleteMany({ communityId: { $in: ids } }),
    reports().deleteMany({ communityId: { $in: ids } }),
    blocks().deleteMany({ $or: [{ userId }, { blockedId: userId }] }),
  ]);
  await posts().updateMany({ seenBy: userId }, { $pull: { seenBy: userId } });
  await events().updateMany({ going: userId }, { $pull: { going: userId } });
}

@Injectable()
export class CommunityService implements OnModuleInit {
  async onModuleInit() {
    await communities().createIndex({ inviteCode: 1 }, { unique: true });
    await members().createIndex({ communityId: 1, userId: 1 }, { unique: true });
    await members().createIndex({ userId: 1 });
    await posts().createIndex({ communityId: 1, createdAt: -1 });
    await events().createIndex({ communityId: 1, startsAt: 1 });
    await blocks().createIndex({ userId: 1, blockedId: 1 }, { unique: true });
  }

  /** Someone outside the community cannot tell whether it exists. */
  private async membership(communityId: string, userId: string) {
    const member = await members().findOne({ communityId, userId });
    if (!member) throw new NotFoundException();
    return member;
  }

  private async leader(communityId: string, userId: string) {
    const member = await this.membership(communityId, userId);
    if (member.role !== 'leader') throw new ForbiddenException();
    return member;
  }

  async create(user: Actor, body: { name?: unknown; description?: unknown }) {
    const community: Community = {
      _id: randomUUID(),
      name: text(body.name, 80),
      description: text(body.description, 500, false),
      ownerId: user.id,
      inviteCode: newInvite(),
      createdAt: Date.now(),
    };
    await communities().insertOne(community);
    await members().insertOne({ communityId: community._id, userId: user.id, name: user.name, role: 'leader', joinedAt: Date.now() });
    return { id: community._id, inviteCode: community.inviteCode };
  }

  async mine(userId: string) {
    const mine = await members().find({ userId }).toArray();
    const found = await communities().find({ _id: { $in: mine.map((m) => m.communityId) } }).toArray();
    return Promise.all(
      found.map(async (c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        role: mine.find((m) => m.communityId === c._id)!.role,
        memberCount: await members().countDocuments({ communityId: c._id }),
      })),
    );
  }

  async join(user: Actor, code: unknown) {
    const community = await communities().findOne({ inviteCode: text(code, 20).toUpperCase() });
    if (!community) throw new NotFoundException();
    await members().updateOne(
      { communityId: community._id, userId: user.id },
      { $setOnInsert: { name: user.name, role: 'member', joinedAt: Date.now() } },
      { upsert: true },
    );
    return { id: community._id };
  }

  async detail(id: string, userId: string) {
    const me = await this.membership(id, userId);
    const community = await communities().findOne({ _id: id });
    if (!community) throw new NotFoundException();
    const all = await members().find({ communityId: id }).sort({ joinedAt: 1 }).toArray();
    return {
      id,
      name: community.name,
      description: community.description,
      meetLink: community.meetLink ?? null,
      role: me.role,
      isOwner: community.ownerId === userId,
      // The code lets people in, so only leaders hold it.
      inviteCode: me.role === 'leader' ? community.inviteCode : null,
      members: all.map((m) => ({ userId: m.userId, name: m.name, role: m.role, isOwner: m.userId === community.ownerId })),
    };
  }

  async update(id: string, userId: string, body: { name?: unknown; description?: unknown; meetLink?: unknown }) {
    await this.leader(id, userId);
    await communities().updateOne(
      { _id: id },
      { $set: { name: text(body.name, 80), description: text(body.description, 500, false), meetLink: webLink(body.meetLink) } },
    );
  }

  async rotateInvite(id: string, userId: string) {
    await this.leader(id, userId);
    const inviteCode = newInvite();
    await communities().updateOne({ _id: id }, { $set: { inviteCode } });
    return { inviteCode };
  }

  async remove(id: string, userId: string) {
    const community = await communities().findOne({ _id: id, ownerId: userId });
    if (!community) throw new NotFoundException();
    await Promise.all([
      communities().deleteOne({ _id: id }),
      members().deleteMany({ communityId: id }),
      posts().deleteMany({ communityId: id }),
      events().deleteMany({ communityId: id }),
      reports().deleteMany({ communityId: id }),
    ]);
  }

  async removeMember(id: string, requesterId: string, targetId: string) {
    const requester = await this.membership(id, requesterId);
    const community = await communities().findOne({ _id: id });
    if (targetId === community?.ownerId) throw new ForbiddenException();
    if (requesterId !== targetId && requester.role !== 'leader') throw new ForbiddenException();
    await members().deleteOne({ communityId: id, userId: targetId });
  }

  async setRole(id: string, requesterId: string, targetId: string, role: unknown) {
    const community = await communities().findOne({ _id: id, ownerId: requesterId });
    if (!community) throw new ForbiddenException();
    if (targetId === requesterId || (role !== 'leader' && role !== 'member')) throw new BadRequestException();
    await members().updateOne({ communityId: id, userId: targetId }, { $set: { role } });
  }

  async feed(id: string, userId: string, before: unknown) {
    await this.membership(id, userId);
    const blocked = await blocks().find({ userId }).map((b) => b.blockedId).toArray();
    const limit = Number(before);
    const page = await posts()
      .find({ communityId: id, authorId: { $nin: blocked }, ...(limit > 0 ? { createdAt: { $lt: limit } } : {}) })
      .sort({ createdAt: -1 })
      .limit(FEED_PAGE)
      .toArray();
    return page.map(({ _id, authorId, authorName, kind, text: body, attachment, seenBy, createdAt }) => ({
      id: _id, authorId, authorName, kind, text: body, attachment: attachment ?? null, createdAt,
      seenCount: seenBy.length, seenByMe: seenBy.includes(userId), mine: authorId === userId,
    }));
  }

  async createPost(id: string, user: Actor, body: { text?: unknown; kind?: unknown; attachment?: { title?: unknown; study?: unknown } }) {
    const member = await this.membership(id, user.id);
    const kind = body.kind === 'notice' ? 'notice' : 'post';
    if (kind === 'notice' && member.role !== 'leader') throw new ForbiddenException();
    const attachment = body.attachment
      ? { title: text(body.attachment.title, 200), study: body.attachment.study ?? null }
      : undefined;
    if (attachment && JSON.stringify(attachment.study).length > MAX_ATTACHMENT_BYTES) throw new BadRequestException('Attachment too large');
    const post: Post = {
      _id: randomUUID(), communityId: id, authorId: user.id, authorName: member.name, kind,
      text: text(body.text, 4000, !attachment), seenBy: [], createdAt: Date.now(),
      ...(attachment ? { attachment } : {}),
    };
    await posts().insertOne(post);
    return { id: post._id };
  }

  async deletePost(id: string, userId: string, postId: string) {
    const member = await this.membership(id, userId);
    const post = await posts().findOne({ _id: postId, communityId: id });
    if (!post) throw new NotFoundException();
    if (post.authorId !== userId && member.role !== 'leader') throw new ForbiddenException();
    await posts().deleteOne({ _id: postId });
    await reports().deleteMany({ postId });
  }

  async markSeen(id: string, userId: string, postId: string) {
    await this.membership(id, userId);
    await posts().updateOne({ _id: postId, communityId: id }, { $addToSet: { seenBy: userId } });
  }

  async report(id: string, userId: string, postId: string, reason: unknown) {
    await this.membership(id, userId);
    const post = await posts().findOne({ _id: postId, communityId: id });
    if (!post) throw new NotFoundException();
    await reports().updateOne(
      { postId, reporterId: userId },
      { $set: { communityId: id, authorId: post.authorId, text: post.text, reason: text(reason, 500, false), at: Date.now() } },
      { upsert: true },
    );
  }

  async listReports(id: string, userId: string) {
    await this.leader(id, userId);
    const found = await reports().find({ communityId: id }).sort({ at: -1 }).limit(100).toArray();
    return found.map(({ postId, text: body, reason, at }) => ({ postId, text: body, reason, at }));
  }

  async listEvents(id: string, userId: string) {
    await this.membership(id, userId);
    const page = await events().find({ communityId: id, startsAt: { $gte: Date.now() - 86_400_000 } }).sort({ startsAt: 1 }).limit(100).toArray();
    return page.map(({ _id, title, description, startsAt, place, meetLink, going }) => ({
      id: _id, title, description, startsAt, place: place ?? null, meetLink: meetLink ?? null,
      goingCount: going.length, goingByMe: going.includes(userId),
    }));
  }

  private eventFields(body: { title?: unknown; description?: unknown; startsAt?: unknown; place?: unknown; meetLink?: unknown }) {
    if (typeof body.startsAt !== 'number' || !Number.isFinite(body.startsAt)) throw new BadRequestException('Invalid date');
    return {
      title: text(body.title, 120),
      description: text(body.description, 2000, false),
      startsAt: body.startsAt,
      place: text(body.place, 200, false) || undefined,
      meetLink: webLink(body.meetLink),
    };
  }

  async createEvent(id: string, userId: string, body: Parameters<CommunityService['eventFields']>[0]) {
    await this.leader(id, userId);
    const event: Event = { _id: randomUUID(), communityId: id, ...this.eventFields(body), going: [], createdBy: userId };
    await events().insertOne(event);
    return { id: event._id };
  }

  async updateEvent(id: string, userId: string, eventId: string, body: Parameters<CommunityService['eventFields']>[0]) {
    await this.leader(id, userId);
    await events().updateOne({ _id: eventId, communityId: id }, { $set: this.eventFields(body) });
  }

  async deleteEvent(id: string, userId: string, eventId: string) {
    await this.leader(id, userId);
    await events().deleteOne({ _id: eventId, communityId: id });
  }

  async rsvp(id: string, userId: string, eventId: string, going: unknown) {
    await this.membership(id, userId);
    const change = going === true ? { $addToSet: { going: userId } } : { $pull: { going: userId } };
    await events().updateOne({ _id: eventId, communityId: id }, change);
  }

  async block(userId: string, blockedId: unknown) {
    const target = text(blockedId, 100);
    if (target === userId) throw new BadRequestException();
    await blocks().updateOne({ userId, blockedId: target }, { $setOnInsert: { userId, blockedId: target } }, { upsert: true });
  }

  async unblock(userId: string, blockedId: string) {
    await blocks().deleteOne({ userId, blockedId });
  }
}

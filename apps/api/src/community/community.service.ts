import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Community, CommunityMember, CommunityPost, Prisma } from '@preachfy/database';
import { nanoid } from 'nanoid';

@Injectable()
export class CommunityService {
    constructor(private prisma: PrismaService) { }

    async create(ownerId: string, name: string, description?: string): Promise<Community> {
        const inviteCode = nanoid(10);
        const community = await this.prisma.community.create({
            data: {
                name,
                description,
                inviteCode,
                owner: { connect: { id: ownerId } },
            },
        });

        // Owner automatically becomes a LEADER member
        await this.prisma.communityMember.create({
            data: {
                userId: ownerId,
                communityId: community.id,
                role: 'LEADER',
            },
        });

        return community;
    }

    async joinByInvite(userId: string, inviteCode: string): Promise<CommunityMember> {
        const community = await this.prisma.community.findUnique({
            where: { inviteCode },
        });

        if (!community) {
            throw new NotFoundException('Comunidade não encontrada.');
        }

        return this.prisma.communityMember.upsert({
            where: {
                userId_communityId: { userId, communityId: community.id },
            },
            update: {},
            create: {
                userId,
                communityId: community.id,
                role: 'MEMBER',
            },
        });
    }

    async getMyCommunities(userId: string) {
        return this.prisma.community.findMany({
            where: {
                members: { some: { userId } },
            },
            include: {
                _count: { select: { members: true } },
                owner: { select: { id: true, name: true, image: true } },
            },
        });
    }

    async getMembers(communityId: string) {
        return this.prisma.communityMember.findMany({
            where: { communityId },
            include: {
                user: { select: { id: true, name: true, image: true, email: true } }
            },
            orderBy: { joinedAt: 'asc' }
        });
    }

    async updateCommunity(userId: string, id: string, data: { name?: string, meetLink?: string }) {
        const community = await this.prisma.community.findUnique({ where: { id } });
        if (!community || community.ownerId !== userId) throw new ForbiddenException('Não autorizado.');

        return this.prisma.community.update({
            where: { id },
            data
        });
    }

    // ─── POSTS (Unified Feed) ──────────────────────────────────

    async createPost(userId: string, communityId: string, data: {
        content: string,
        type?: string,
        sermonId?: string,
        eventId?: string
    }): Promise<CommunityPost> {
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!member) throw new ForbiddenException('Não autorizado.');

        const postType = data.sermonId ? 'SERMAO' : (data.type || 'ALINHAMENTO');

        return (this.prisma.communityPost as any).create({
            data: {
                content: data.content,
                authorId: userId,
                communityId,
                type: postType,
                vistoPor: postType === 'ALINHAMENTO' ? [userId] : [],
                sermonId: data.sermonId || null,
                eventId: data.eventId || null,
            },
        });
    }

    async updatePost(userId: string, postId: string, data: { content?: string }) {
        const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post não encontrado.');

        // Check authorization: author or LEADER
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId: post.communityId } }
        });
        if (!member || (post.authorId !== userId && member.role !== 'LEADER')) {
            throw new ForbiddenException('Não autorizado.');
        }

        return this.prisma.communityPost.update({
            where: { id: postId },
            data: { content: data.content }
        });
    }

    async deletePost(userId: string, postId: string) {
        const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('Post não encontrado.');

        // Check authorization: author or LEADER
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId: post.communityId } }
        });
        if (!member || (post.authorId !== userId && member.role !== 'LEADER')) {
            throw new ForbiddenException('Não autorizado.');
        }

        return this.prisma.communityPost.delete({ where: { id: postId } });
    }

    async acknowledgePost(userId: string, postId: string) {
        return this.prisma.communityPost.update({
            where: { id: postId },
            data: {
                vistoPor: {
                    push: userId,
                },
            },
        });
    }

    async getFeed(communityId: string) {
        // Return ALL posts (alinhamentos + sermões) in chronological order
        const posts = await (this.prisma.communityPost as any).findMany({
            where: { communityId },
            include: {
                author: { select: { id: true, name: true, image: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        // Populate vistoPor data for alinhamento posts
        const allUserIds = Array.from(new Set(posts.flatMap((p: any) => p.vistoPor))) as string[];
        const users = allUserIds.length > 0 ? await this.prisma.user.findMany({
            where: { id: { in: allUserIds } },
            select: { id: true, name: true, image: true }
        }) : [];
        const userMap: any = Object.fromEntries(users.map(u => [u.id, u]));

        // For sermon posts, fetch sermon data with blocks
        const sermonIds = (posts as any[]).map(p => p.sermonId).filter(Boolean) as string[];
        const sermons = sermonIds.length > 0 ? await this.prisma.sermon.findMany({
            where: { id: { in: sermonIds } },
            include: { blocks: { orderBy: { order: 'asc' } } }
        }) : [];
        const sermonMap = new Map(sermons.map(s => [s.id, s]));

        // For posts with events, fetch event data
        const eventIds = (posts as any[]).map(p => p.eventId).filter(Boolean) as string[];
        const events = eventIds.length > 0 ? await this.prisma.communityEvent.findMany({
            where: { id: { in: eventIds } }
        }) : [];
        const eventMap = new Map(events.map(e => [e.id, e]));

        return posts.map((post: any) => {
            const sermon: any = post.sermonId ? sermonMap.get(post.sermonId) : null;
            const event: any = post.eventId ? eventMap.get(post.eventId) : null;

            return {
                ...post,
                authorName: post.author?.name,
                authorImage: post.author?.image,
                vistoPorData: (post.vistoPor || []).map((id: string) => userMap[id]).filter(Boolean),
                // Sermon data (for SERMAO type)
                sermon: sermon ? {
                    id: sermon.id,
                    title: sermon.title,
                    category: sermon.category,
                    bibleSources: sermon.bibleSources || [],
                    blocks: (sermon.blocks || []).map((b: any) => ({
                        id: b.id, type: b.type, content: b.content,
                        metadata: b.metadata || {}, order: b.order
                    }))
                } : null,
                // Event data (for attached events)
                event: event ? {
                    id: event.id, title: event.title, description: event.description,
                    date: event.date, type: event.type, meetLink: event.meetLink
                } : null
            };
        });
    }

    async shareSermon(userId: string, communityId: string, sermonId: string): Promise<CommunityPost> {
        const sermon = await this.prisma.sermon.findUnique({ where: { id: sermonId } });
        if (!sermon) throw new NotFoundException('Sermão não encontrado.');

        return (this.prisma.communityPost as any).create({
            data: {
                content: `Partilhou um estudo: ${sermon.title}`,
                communityId,
                authorId: userId,
                type: 'SERMAO',
                sermonId,
                vistoPor: [],
            }
        });
    }

    async getSharedSermons(communityId: string) {
        const posts = await (this.prisma.communityPost as any).findMany({
            where: { communityId, sermonId: { not: null } },
            orderBy: { createdAt: 'desc' },
            include: { author: true }
        });

        const sermonIds = (posts as any[]).map(p => p.sermonId).filter(Boolean) as string[];
        const sermons = await this.prisma.sermon.findMany({
            where: { id: { in: sermonIds } },
            include: { blocks: { orderBy: { order: 'asc' } } }
        });
        const sermonMap = new Map(sermons.map(s => [s.id, s]));

        return (posts as any[]).map(post => {
            const s: any = sermonMap.get(post.sermonId || '');
            return {
                id: post.id,
                sermonId: post.sermonId,
                title: s?.title || 'Estudo Original',
                category: s?.category || 'Sermão',
                bibleSources: s?.bibleSources || [],
                blocks: (s?.blocks || []).map((b: any) => ({
                    id: b.id, type: b.type, content: b.content,
                    metadata: b.metadata || {}, order: b.order
                })),
                sharedAt: post.createdAt,
                sharedByName: post.author?.name || 'Membro do Hub',
                sharedByImage: post.author?.image
            };
        });
    }

    // ─── EVENTS ──────────────────────────────────────────────

    async createEvent(userId: string, communityId: string, data: {
        title: string, description?: string, date: string,
        meetLink?: string, type?: string, participants?: string[]
    }) {
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!member) throw new ForbiddenException('Não autorizado.');

        const community = await this.prisma.community.findUnique({ where: { id: communityId } }) as any;
        let meetLink = data.meetLink || community?.meetLink;

        return (this.prisma.communityEvent as any).create({
            data: {
                title: data.title,
                description: data.description,
                date: new Date(data.date),
                type: data.type || 'ONLINE',
                meetLink,
                communityId,
                createdById: userId,
                participants: data.participants || [],
            }
        });
    }

    async getEvents(communityId: string) {
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        return this.prisma.communityEvent.findMany({
            where: {
                communityId,
                date: { gte: sixHoursAgo }
            },
            orderBy: { date: 'asc' },
        });
    }

    async updateEvent(userId: string, eventId: string, data: {
        title?: string, description?: string, date?: string,
        type?: string, meetLink?: string, participants?: string[]
    }) {
        const event = await this.prisma.communityEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new NotFoundException('Evento não encontrado.');

        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId: event.communityId } }
        });
        if (!member || member.role !== 'LEADER') throw new ForbiddenException('Não autorizado.');

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.date !== undefined) updateData.date = new Date(data.date);
        if (data.type !== undefined) updateData.type = data.type;
        if (data.meetLink !== undefined) updateData.meetLink = data.meetLink;
        if (data.participants !== undefined) updateData.participants = data.participants;

        return (this.prisma.communityEvent as any).update({
            where: { id: eventId },
            data: updateData
        });
    }

    async deleteEvent(userId: string, eventId: string) {
        const event = await this.prisma.communityEvent.findUnique({ where: { id: eventId } });
        if (!event) throw new NotFoundException('Evento não encontrado.');

        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId: event.communityId } }
        });
        if (!member || member.role !== 'LEADER') throw new ForbiddenException('Não autorizado.');

        return this.prisma.communityEvent.delete({ where: { id: eventId } });
    }
}

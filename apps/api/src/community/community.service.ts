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

    async createPost(userId: string, communityId: string, content: string): Promise<CommunityPost> {
        // Check if user is member and potentially leader if we want to restrict posting
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });

        if (!member) throw new ForbiddenException('Não autorizado.');

        return this.prisma.communityPost.create({
            data: {
                content,
                authorId: userId,
                community: { connect: { id: communityId } },
                vistoPor: [userId], // Author has seen it
            },
        });
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
        return this.prisma.communityPost.findMany({
            where: { communityId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async shareSermon(userId: string, communityId: string, sermonId: string): Promise<CommunityPost> {
        const sermon = await this.prisma.sermon.findUnique({ where: { id: sermonId } });
        if (!sermon) throw new NotFoundException('Sermão não encontrado.');

        return this.createPost(
            userId,
            communityId,
            `Compartilhou um Estudo: **${sermon.title}**\nClique para visualizar no seu Studio.`
        );
    }

    async createEvent(userId: string, communityId: string, data: { title: string, description?: string, date: string, meetLink?: string }) {
        // Check if member
        const member = await this.prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!member) throw new ForbiddenException('Não autorizado.');

        // Logic: assigned Google Meet link if not provided
        let meetLink = data.meetLink;
        if (!meetLink) {
            const randomCode = nanoid(3) + '-' + nanoid(4) + '-' + nanoid(3);
            meetLink = `https://meet.google.com/${randomCode.toLowerCase()}`;
        }

        return this.prisma.communityEvent.create({
            data: {
                title: data.title,
                description: data.description,
                date: new Date(data.date),
                meetLink,
                community: { connect: { id: communityId } },
            }
        });
    }

    async getEvents(communityId: string) {
        return this.prisma.communityEvent.findMany({
            where: {
                communityId,
                date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
        });
    }
}

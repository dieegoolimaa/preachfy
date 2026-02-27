import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CommunityEvent } from '@preachfy/database';

@Injectable()
export class EventService {
    constructor(private prisma: PrismaService) { }

    async createEvent(data: {
        communityId: string;
        title: string;
        description: string;
        date: Date;
        meetLink?: string;
    }): Promise<CommunityEvent> {
        return this.prisma.communityEvent.create({
            data: {
                title: data.title,
                description: data.description,
                date: data.date,
                meetLink: data.meetLink,
                community: { connect: { id: data.communityId } },
            },
        });
    }

    async getCommunityEvents(communityId: string) {
        return this.prisma.communityEvent.findMany({
            where: { communityId },
            orderBy: { date: 'asc' },
        });
    }
}

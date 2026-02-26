import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, GlobalInsight } from '@preachfy/database';

@Injectable()
export class InsightService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.GlobalInsightCreateInput): Promise<GlobalInsight> {
        return this.prisma.globalInsight.create({
            data,
        });
    }

    async findAllByUser(userId: string): Promise<GlobalInsight[]> {
        return this.prisma.globalInsight.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string): Promise<GlobalInsight | null> {
        return this.prisma.globalInsight.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Prisma.GlobalInsightUpdateInput): Promise<GlobalInsight> {
        return this.prisma.globalInsight.update({
            where: { id },
            data,
        });
    }

    async remove(id: string): Promise<GlobalInsight> {
        return this.prisma.globalInsight.delete({
            where: { id },
        });
    }
}

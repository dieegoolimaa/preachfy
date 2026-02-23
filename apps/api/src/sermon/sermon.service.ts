import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Sermon, Block, Prisma } from '@preachfy/database';

@Injectable()
export class SermonService {
    constructor(private prisma: PrismaService) { }

    async createSermon(data: Prisma.SermonCreateInput): Promise<Sermon> {
        return this.prisma.sermon.create({
            data,
        });
    }

    async getSermon(id: string): Promise<Sermon | null> {
        return this.prisma.sermon.findUnique({
            where: { id },
            include: { blocks: true },
        });
    }

    async updateBlock(id: string, data: Prisma.BlockUpdateInput): Promise<Block> {
        return this.prisma.block.update({
            where: { id },
            data,
        });
    }

    async syncFullSermon(sermonId: string, blocks: any[]): Promise<void> {
        // Basic sync: delete and recreate or upsert
        // For MVP, we'll do an upsert or simple overwrite depending on volume
        for (const block of blocks) {
            const { id, ...content } = block;
            await this.prisma.block.upsert({
                where: { id: id || 'new-id' },
                update: { ...content },
                create: {
                    ...content,
                    sermon: { connect: { id: sermonId } },
                },
            });
        }
    }

    async markAsPreached(blockId: string): Promise<Block> {
        return this.prisma.block.update({
            where: { id: blockId },
            data: { preached: true },
        });
    }
}

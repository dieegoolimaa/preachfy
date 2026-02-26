import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Sermon, Block, Prisma } from '@preachfy/database';

@Injectable()
export class SermonService {
  constructor(private prisma: PrismaService) { }

  async createSermon(data: Prisma.SermonCreateInput): Promise<Sermon> {
    return this.prisma.sermon.create({
      data,
      include: {
        blocks: { orderBy: { order: 'asc' } }
      },
    });
  }

  async getAllSermons(authorId?: string): Promise<Sermon[]> {
    return this.prisma.sermon.findMany({
      where: authorId ? { authorId } : {},
      include: {
        blocks: { orderBy: { order: 'asc' } },
        _count: { select: { history: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSermon(id: string): Promise<Sermon | null> {
    return this.prisma.sermon.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        history: { orderBy: { date: 'desc' } },
      },
    });
  }

  async updateSermon(
    id: string,
    data: Prisma.SermonUpdateInput | any,
  ): Promise<Sermon> {
    // Remove invalid injected properties from partial payloads sent by sockets or front-end
    const { id: _id, authorId, createdAt, updatedAt, blocks, history, _count, ...safeData } = data as any;

    return this.prisma.sermon.update({
      where: { id },
      data: safeData,
      include: {
        blocks: { orderBy: { order: 'asc' } }
      },
    });
  }

  async deleteSermon(id: string): Promise<Sermon> {
    // Apaga os registros dependentes para evitar erro P2014
    await this.prisma.ministryHistory.deleteMany({
      where: { sermonId: id },
    });
    await this.prisma.block.deleteMany({
      where: { sermonId: id },
    });

    return this.prisma.sermon.delete({
      where: { id },
    });
  }

  async addHistory(sermonId: string, data: any) {
    return this.prisma.ministryHistory.create({
      data: {
        ...data,
        sermon: { connect: { id: sermonId } },
      },
    });
  }

  async syncFullSermon(sermonId: string, blocks: any[]): Promise<void> {
    // Delete existing blocks individually to avoid transactional requirement of deleteMany on MongoDB non-replica sets
    const existingBlocks = await this.prisma.block.findMany({
      where: { sermonId },
      select: { id: true }
    });

    for (const block of existingBlocks) {
      await this.prisma.block.delete({ where: { id: block.id } });
    }

    // Create new blocks
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      await this.prisma.block.create({
        data: {
          type: b.type,
          content: b.content,
          metadata: b.metadata ?? Prisma.JsonNull,
          order: i,
          positionX: Number(b.positionX) || 0,
          positionY: Number(b.positionY) || 0,
          preached: Boolean(b.preached),
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

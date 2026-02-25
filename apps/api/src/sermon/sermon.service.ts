import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Sermon, Block, Prisma } from '@preachfy/database';

@Injectable()
export class SermonService {
  constructor(private prisma: PrismaService) { }

  async createSermon(data: Prisma.SermonCreateInput): Promise<Sermon> {
    return this.prisma.sermon.create({
      data,
      include: { blocks: true },
    });
  }

  async getAllSermons(authorId?: string): Promise<Sermon[]> {
    return this.prisma.sermon.findMany({
      where: authorId ? { authorId } : {},
      include: {
        blocks: true,
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
    data: Prisma.SermonUpdateInput,
  ): Promise<Sermon> {
    return this.prisma.sermon.update({
      where: { id },
      data,
      include: { blocks: true },
    });
  }

  async deleteSermon(id: string): Promise<Sermon> {
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
      const { id, ...content } = blocks[i];
      await this.prisma.block.create({
        data: {
          ...content,
          order: i,
          positionX: content.positionX ?? 0,
          positionY: content.positionY ?? 0,
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

  async seed(authorId?: string) {
    // Clear only sermons for this author if ID provided, or all if not
    if (authorId) {
      await this.prisma.sermon.deleteMany({ where: { authorId } });
    } else {
      await this.prisma.ministryHistory.deleteMany({});
      await this.prisma.block.deleteMany({});
      await this.prisma.sermon.deleteMany({});
    }

    const davidSermon = await this.prisma.sermon.create({
      data: {
        title: 'Davi: Um Coração Segundo o Coração de Deus',
        authorId,
        category: 'Expositiva',
        status: 'READY',
        bibleSources: [
          {
            id: 'src-david-1',
            reference: '1 Samuel 16:7',
            content: `7 Mas o Senhor disse a Samuel: Não atentes para a sua aparência, nem para a grandeza da sua estatura, porque o tenho rejeitado; porque o Senhor não vê como vê o homem, pois o homem vê o que está diante dos olhos, porém o Senhor olha para o coração.`,
          },
          {
            id: 'src-david-2',
            reference: '1 Samuel 17:45',
            content: `45 Davi, porém, disse ao filisteu: Tu vens contra mim com espada, e com lança, e com escudo; porém eu vou contra ti em nome do Senhor dos Exércitos, o Deus dos exércitos de Israel, a quem tens afrontado.`,
          },
          {
            id: 'src-david-3',
            reference: '2 Samuel 12:13',
            content: `13 Então disse Davi a Natã: Pequei contra o Senhor. E disse Natã a Davi: Também o Senhor perdoou o teu pecado; não morrerás.`,
          },
        ],
      },
    });

    const blocks = [
      {
        type: 'TEXTO_BASE',
        content: 'O Senhor não vê como vê o homem...',
        order: 0,
        metadata: {
          font: 'font-serif',
          depth: 0,
          parentVerseId: '7',
          bibleSourceId: 'src-david-1',
        },
        sermonId: davidSermon.id,
      },
      {
        type: 'EXEGESE',
        content: 'A escolha de Deus ignora padrões humanos de realeza.',
        order: 1,
        metadata: {
          font: 'font-sans',
          depth: 0,
          parentVerseId: '7',
          bibleSourceId: 'src-david-1',
        },
        sermonId: davidSermon.id,
      },
      {
        type: 'ILUSTRACAO',
        content: 'O anonimato das pastagens preparou o herói para o palácio.',
        order: 2,
        metadata: { font: 'font-serif', depth: 1 },
        sermonId: davidSermon.id,
      },
      {
        type: 'APLICACAO',
        content: 'Onde você está sendo fiel hoje quando ninguém te vê?',
        order: 3,
        metadata: { font: 'font-modern', depth: 1 },
        sermonId: davidSermon.id,
      },
      {
        type: 'TEXTO_BASE',
        content: 'Eu vou contra ti em nome do Senhor dos Exércitos!',
        order: 4,
        metadata: {
          font: 'font-serif',
          depth: 0,
          parentVerseId: '45',
          bibleSourceId: 'src-david-2',
        },
        sermonId: davidSermon.id,
      },
      {
        type: 'ENFASE',
        content: 'O seu gigante não é páreo para o seu Deus.',
        order: 5,
        metadata: { font: 'font-sans', depth: 0 },
        sermonId: davidSermon.id,
      },
      {
        type: 'APLICACAO',
        content:
          'A autoridade espiritual vale mais que qualquer armadura de bronze.',
        order: 6,
        metadata: { font: 'font-modern', depth: 1 },
        sermonId: davidSermon.id,
      },
      {
        type: 'TEXTO_BASE',
        content: 'Pequei contra o Senhor.',
        order: 7,
        metadata: {
          font: 'font-serif',
          depth: 0,
          parentVerseId: '13',
          bibleSourceId: 'src-david-3',
        },
        sermonId: davidSermon.id,
      },
      {
        type: 'EXEGESE',
        content:
          'O arrependimento sincero é a marca do homem segundo o coração de Deus.',
        order: 8,
        metadata: {
          font: 'font-sans',
          depth: 0,
          parentVerseId: '13',
          bibleSourceId: 'src-david-3',
        },
        sermonId: davidSermon.id,
      },
      {
        type: 'ENFASE',
        content: 'Deus não busca perfeição, Ele busca dependência.',
        order: 9,
        metadata: { font: 'font-serif', depth: 0 },
        sermonId: davidSermon.id,
      },
    ];

    for (const b of blocks) {
      await this.prisma.block.create({ data: b as any });
    }

    return { message: 'Baseline sermon (David) created, others removed.' };
  }

  async seedV2() {
    return this.seed();
  }
}

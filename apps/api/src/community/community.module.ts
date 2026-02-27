import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PrismaService } from '../prisma.service';

@Module({
    providers: [CommunityService, PrismaService],
    controllers: [CommunityController],
    exports: [CommunityService],
})
export class CommunityModule { }

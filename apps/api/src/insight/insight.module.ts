import { Module } from '@nestjs/common';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InsightController],
  providers: [InsightService, PrismaService]
})
export class InsightModule { }

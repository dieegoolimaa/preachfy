import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SermonGateway } from './sermon/sermon.gateway';
import { PrismaService } from './prisma.service';
import { SermonService } from './sermon/sermon.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SermonGateway, PrismaService, SermonService],
})
export class AppModule { }

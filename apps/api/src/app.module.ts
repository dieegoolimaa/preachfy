import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SermonGateway } from './sermon/sermon.gateway';
import { PrismaService } from './prisma.service';
import { SermonService } from './sermon/sermon.service';
import { SermonController } from './sermon/sermon.controller';

import { BibleService } from './bible/bible.service';
import { BibleController } from './bible/bible.controller';

@Module({
  imports: [],
  controllers: [AppController, SermonController, BibleController],
  providers: [AppService, SermonGateway, PrismaService, SermonService, BibleService],
})
export class AppModule { }

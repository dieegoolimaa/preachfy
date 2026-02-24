import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SermonGateway } from './sermon/sermon.gateway';
import { PrismaService } from './prisma.service';
import { SermonService } from './sermon/sermon.service';
import { SermonController } from './sermon/sermon.controller';

@Module({
  imports: [],
  controllers: [AppController, SermonController],
  providers: [AppService, SermonGateway, PrismaService, SermonService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({ imports: [AccountModule], controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}

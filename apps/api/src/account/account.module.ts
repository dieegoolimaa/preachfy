import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { ProGuard, SessionGuard } from './guards';
import { SyncService } from './sync.service';

@Module({
  controllers: [AccountController],
  providers: [SyncService, SessionGuard, ProGuard],
})
export class AccountModule {}

import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { BillingModule } from './billing/billing.module';
import { CommunityModule } from './community/community.module';
import { HealthController } from './health.controller';
import { LiveModule } from './live/live.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [AccountModule, BillingModule, SyncModule, CommunityModule, LiveModule],
  controllers: [HealthController],
})
export class AppModule {}

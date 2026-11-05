import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module';
import { BillingModule } from './billing/billing.module';
import { HealthController } from './health.controller';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [AccountModule, BillingModule, SyncModule],
  controllers: [HealthController],
})
export class AppModule {}

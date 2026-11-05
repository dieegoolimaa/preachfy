import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { BillingController } from './billing.controller';

@Module({ imports: [AccountModule], controllers: [BillingController] })
export class BillingModule {}

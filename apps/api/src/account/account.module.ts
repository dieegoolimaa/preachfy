import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { ProGuard, SessionGuard } from './guards';

@Module({
  controllers: [AccountController],
  providers: [SessionGuard, ProGuard],
  exports: [SessionGuard, ProGuard],
})
export class AccountModule {}

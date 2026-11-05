import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountModule } from '../account/account.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [AccountModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }])],
  controllers: [LiveController],
  providers: [LiveService],
})
export class LiveModule {}

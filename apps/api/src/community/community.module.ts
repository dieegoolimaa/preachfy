import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({ imports: [AccountModule], controllers: [CommunityController], providers: [CommunityService] })
export class CommunityModule {}

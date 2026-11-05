import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ProGuard, type AuthedRequest } from '../account/guards';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(ProGuard)
  sync(@Req() { user }: AuthedRequest, @Body() body: { since?: unknown; items?: unknown }) {
    return this.syncService.sync(user.id, body?.since, body?.items ?? []);
  }
}

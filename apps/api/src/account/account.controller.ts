import { Body, Controller, Get, Headers, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readEntitlement, refreshEntitlement } from './entitlements';
import { ProGuard, SessionGuard, type AuthedRequest } from './guards';
import { SyncService } from './sync.service';

const digest = (value: string) => createHash('sha256').update(value).digest();

type RevenueCatEvent = {
  app_user_id?: string;
  original_app_user_id?: string;
  transferred_from?: string[];
  transferred_to?: string[];
};

@Controller()
export class AccountController {
  constructor(private readonly syncService: SyncService) {}

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() { user }: AuthedRequest) {
    return { user: { id: user.id, email: user.email, name: user.name }, ...(await readEntitlement(user.id)) };
  }

  /** Called by the app right after a purchase, so Pro does not wait for the webhook. */
  @Post('me/refresh')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async refresh(@Req() { user }: AuthedRequest) {
    await refreshEntitlement(user.id);
    return readEntitlement(user.id);
  }

  @Post('sync')
  @HttpCode(200)
  @UseGuards(ProGuard)
  sync(@Req() { user }: AuthedRequest, @Body() body: { since?: unknown; items?: unknown }) {
    return this.syncService.sync(user.id, body?.since, body?.items ?? []);
  }

  @Post('webhooks/revenuecat')
  @HttpCode(200)
  async revenueCat(@Headers('authorization') header: string | undefined, @Body() body: { event?: RevenueCatEvent }) {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
    if (!expected || !timingSafeEqual(digest(header ?? ''), digest(expected))) throw new UnauthorizedException();
    const event = body?.event ?? {};
    const ids = new Set(
      [event.app_user_id, event.original_app_user_id, ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        .filter((id): id is string => Boolean(id) && !id!.startsWith('$RCAnonymousID:')),
    );
    await Promise.all([...ids].map((id) => refreshEntitlement(id)));
    return { ok: true };
  }
}

import { Body, Controller, Headers, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { SessionGuard, type AuthedRequest } from '../account/guards';
import { readEntitlement, refreshEntitlement } from './entitlements';

const digest = (value: string) => createHash('sha256').update(value).digest();

type RevenueCatEvent = {
  app_user_id?: string;
  original_app_user_id?: string;
  transferred_from?: string[];
  transferred_to?: string[];
};

@Controller()
export class BillingController {
  /** Called by the app right after a purchase, so Pro does not wait for the webhook. */
  @Post('me/refresh')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async refresh(@Req() { user }: AuthedRequest) {
    await refreshEntitlement(user.id);
    return readEntitlement(user.id);
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

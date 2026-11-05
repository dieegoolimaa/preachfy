import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { readEntitlement } from '../billing/entitlements';
import { SessionGuard, type AuthedRequest } from './guards';

@Controller('me')
export class AccountController {
  @Get()
  @UseGuards(SessionGuard)
  async me(@Req() { user }: AuthedRequest) {
    return { user: { id: user.id, email: user.email, name: user.name }, ...(await readEntitlement(user.id)) };
  }
}

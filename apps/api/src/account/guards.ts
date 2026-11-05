import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { getAuth } from './auth';
import { readEntitlement } from '../billing/entitlements';

export type SessionUser = { id: string; email: string; name: string };
export type AuthedRequest = Request & { user: SessionUser };

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const session = await getAuth().api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new UnauthorizedException();
    request.user = session.user;
    return true;
  }
}

@Injectable()
export class ProGuard extends SessionGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const { user } = context.switchToHttp().getRequest<AuthedRequest>();
    const { pro } = await readEntitlement(user.id);
    if (!pro) throw new ForbiddenException('Pro required');
    return true;
  }
}

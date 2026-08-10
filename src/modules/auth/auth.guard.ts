import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AppAuth } from './auth.config';
import { BETTER_AUTH } from './auth.config';
import { IS_PUBLIC_KEY } from './public.decorator';
import { toFetchHeaders } from '@/shared/utils/node-headers.utils';

/**
 * Resolves the better-auth session from either a cookie (web) or an
 * `Authorization: Bearer <token>` header (mobile — supplied by the bearer
 * plugin). Populates `req.user` and `req.session`.
 *
 * Routes marked @Public() skip the check entirely.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: AppAuth,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const session = await this.auth.api.getSession({
      headers: toFetchHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = session.user;
    request.session = session.session;

    return true;
  }
}

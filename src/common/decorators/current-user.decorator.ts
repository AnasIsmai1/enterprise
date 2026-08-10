import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type SessionUser = NonNullable<Request['user']>;

/**
 * @CurrentUser() param decorator — extracts the authenticated user from the
 * request. AuthGuard populates it from the better-auth session.
 *
 * Usage:
 *   @CurrentUser() user: SessionUser   — the whole user
 *   @CurrentUser('id') userId: string  — a single field
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    return data ? user?.[data] : user;
  }
);

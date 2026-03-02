import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() param decorator — extracts authenticated user from request.
 *
 * Usage:
 *   @CurrentUser() user: Users        — gets full user object
 *   @CurrentUser('id') userId: string — gets a specific field
 *
 * Requires JwtAuthGuard (Phase 2) to have populated req.user.
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

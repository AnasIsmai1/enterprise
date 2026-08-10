import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Pulls the active organization id off a request, or refuses.
 *
 * Exported separately from the decorator so it can be tested directly —
 * `createParamDecorator` hides its factory, and a test that reaches into Nest
 * internals to find it can silently stop testing anything.
 */
export function requireActiveOrganization(
  request: Pick<Request, 'session'>
): string {
  const organizationId = request.session?.activeOrganizationId;

  // Returning undefined would widen every downstream query to all tenants,
  // which is precisely the failure this exists to prevent.
  if (!organizationId) {
    throw new BadRequestException(
      'No active organization. Call POST /api/auth/organization/set-active first.'
    );
  }

  return organizationId;
}

/**
 * The caller's active organization id, from the better-auth session.
 *
 *   findAll(@ActiveOrganization() organizationId: string) { ... }
 */
export const ActiveOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    requireActiveOrganization(ctx.switchToHttp().getRequest<Request>())
);

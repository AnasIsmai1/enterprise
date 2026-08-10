import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AppAuth } from './auth.config';
import { BETTER_AUTH } from './auth.config';
import { toFetchHeaders } from '@/shared/utils/node-headers.utils';

export const ORG_ROLES_KEY = 'orgRoles';

/** Roles the organization plugin creates by default. */
export type OrgRole = 'owner' | 'admin' | 'member';

/**
 * Requires the caller to hold one of the given roles in their *active*
 * organization.
 *
 *   @OrgRoles('owner', 'admin')
 *   @Delete(':id')
 *   remove() { ... }
 *
 * Must run after AuthGuard. Tenancy itself is not enforced here — scope every
 * org-owned query by the active organization id in the service layer and return
 * 404, not 403, for another tenant's resource.
 */
export const OrgRoles = (...roles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    @Inject(BETTER_AUTH) private readonly auth: AppAuth,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const headers = toFetchHeaders(request.headers);

    const member = await this.auth.api
      .getActiveMember({ headers })
      .catch(() => null);

    if (!member) {
      throw new ForbiddenException('No active organization');
    }

    // better-auth stores multiple roles as a comma-separated string.
    const held = String(member.role)
      .split(',')
      .map((r) => r.trim());

    if (!held.some((role) => required.includes(role as OrgRole))) {
      throw new ForbiddenException(
        `Requires organization role: ${required.join(' or ')}`
      );
    }

    return true;
  }
}

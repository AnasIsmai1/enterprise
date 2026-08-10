import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppRole } from '@/modules/auth/auth.config';

/**
 * Application-level role guard — SEC-09, SEC-10.
 *
 * Reads @Roles() metadata and checks it against `req.user.role`, which AuthGuard
 * populates from the better-auth session. No @Roles() means the route is open to
 * any authenticated caller.
 *
 * For per-organization permissions use @OrgRoles() / OrgRolesGuard instead.
 *
 * NOTE: Resource ownership (SEC-09) is enforced in service methods, not guards.
 * Service methods scope queries to the caller and return 404 (not 403) for
 * resources belonging to someone else (SEC-10).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const role = (request.user as { role?: string } | undefined)?.role;

    return requiredRoles.includes(role as AppRole);
  }
}

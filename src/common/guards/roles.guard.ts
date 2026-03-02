import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/user/core/entities/user.entity';

/**
 * Role-based access guard — SEC-09, SEC-10.
 *
 * Reads @Roles() metadata from handler/class, checks against req.user.role.
 * If no @Roles() decorator is present, the guard allows access (endpoint is open to all).
 *
 * NOTE: Resource ownership (SEC-09) is enforced in service methods, not guards.
 * Service methods scope all queries to req.user.id and return 404 (not 403)
 * for resources belonging to other users (SEC-10).
 *
 * Usage:
 *   Apply @UseGuards(JwtAuthGuard, RolesGuard) on controller/route level.
 *   Or register globally in AppModule: { provide: APP_GUARD, useClass: RolesGuard }
 *   (requires JwtAuthGuard to run first to populate req.user)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No @Roles() decorator = open to all authenticated users
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}

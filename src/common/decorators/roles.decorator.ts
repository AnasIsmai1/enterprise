import { SetMetadata } from '@nestjs/common';
import { AppRole } from '@/modules/auth/auth.config';

export const ROLES_KEY = 'roles';

/**
 * Application-level role gate — distinct from @OrgRoles(), which checks a
 * member's role inside their active organization.
 *
 * Usage:
 *   @Roles(AppRole.ADMIN)
 *
 * Used with RolesGuard, which reads `req.user.role` populated by AuthGuard.
 * Routes without @Roles() are open to any authenticated user.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

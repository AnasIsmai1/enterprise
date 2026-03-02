import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/user/core/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * @Roles() decorator for role-based access control.
 *
 * Usage:
 *   @Roles(UserRole.SUPERADMIN)
 *   @Roles(UserRole.PREMIUM, UserRole.SUPERADMIN)
 *
 * Used with RolesGuard which reads this metadata.
 * Routes without @Roles() are treated as accessible to all authenticated users.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

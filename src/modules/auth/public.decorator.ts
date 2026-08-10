import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without a session.
 *
 * AuthGuard is registered globally (APP_GUARD), so every route is protected by
 * default and opting out has to be explicit — the safe direction for the
 * default. better-auth's own /api/auth/* routes bypass Nest entirely and are
 * unaffected.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

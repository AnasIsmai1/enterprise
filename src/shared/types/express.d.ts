import type { AppAuth } from '@/modules/auth/auth.config';

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<AppAuth['api']['getSession']>>
>;

declare global {
  namespace Express {
    interface Request {
      /** Populated by AuthGuard from the better-auth session. */
      user?: BetterAuthSession['user'];
      session?: BetterAuthSession['session'];
    }
  }
}

export {};

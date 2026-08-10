import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type Redis from 'ioredis';
import { EmailService } from '@/external/email/email.service';
import { AuditLogService } from '@/modules/audit/audit.service';
import { EmailType } from '@/external/email/email.types';
import { parseTtlSeconds } from '@/shared/utils/ttl.utils';

/**
 * better-auth is ESM-only (`"type": "module"`, no `require` condition) while this
 * project compiles to CommonJS. It is therefore loaded with a dynamic `import()`,
 * which `.swcrc` preserves via `module.ignoreDynamic`. Do not convert these to
 * static imports — SWC would rewrite them to `require()` and the process would
 * fail at boot with ERR_REQUIRE_ESM.
 */
export const BETTER_AUTH = 'BETTER_AUTH';

/** Application-level role, distinct from a member's role inside an organization. */
export enum AppRole {
  USER = 'user',
  ADMIN = 'admin',
}

const logger = new Logger('BetterAuth');

export async function createAuth(
  config: ConfigService,
  emailService: EmailService,
  audit: AuditLogService,
  redis: Redis
) {
  const [{ betterAuth }, { organization }, { bearer }] = await Promise.all([
    import('better-auth'),
    import('better-auth/plugins/organization'),
    import('better-auth/plugins/bearer'),
  ]);

  const clientUrls = (config.get<string>('app.clientUrl') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = new Pool({
    host: config.get<string>('database.host'),
    port: config.get<number>('database.port'),
    user: config.get<string>('database.user'),
    password: config.get<string>('database.password'),
    database: config.get<string>('database.name'),
  });

  const appName = config.get<string>('app.name', 'Enterprise API');

  return betterAuth({
    appName,
    secret: config.get<string>('auth.secret'),
    baseURL: config.get<string>('auth.baseUrl'),
    basePath: '/api/auth',
    trustedOrigins: clientUrls,

    // Shares the application database. better-auth owns its own tables
    // (user, session, account, verification, organization, member, invitation)
    // and reaches them through Kysely, not TypeORM.
    database: pool,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: config.get<boolean>(
        'auth.requireEmailVerification',
        true
      ),
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        await emailService.send(EmailType.PASSWORD_RESET, {
          to: user.email,
          params: { url, name: user.name, appName },
        });
      },
      onPasswordReset: ({ user }) => {
        logger.log(`Password reset completed for ${user.id}`);
        return Promise.resolve();
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await emailService.send(EmailType.VERIFICATION, {
          to: user.email,
          params: { url, name: user.name, appName },
        });
      },
    },

    session: {
      expiresIn: parseTtlSeconds(
        config.get<string>('auth.sessionExpiration') ?? '7d',
        7 * 86400
      ),
      // Sliding expiry: re-issue once the session is a day old.
      updateAge: 86400,
    },

    // Auth-specific limits, separate from the global 100 req/min throttle. The
    // global limit is far too generous for credential endpoints — 100 sign-in
    // attempts a minute is a workable password-guessing budget.
    rateLimit: {
      enabled: true,
      storage: 'secondary-storage',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 3600, max: 10 },
        '/forget-password': { window: 3600, max: 5 },
        '/reset-password': { window: 3600, max: 5 },
        '/send-verification-email': { window: 3600, max: 5 },
        '/organization/invite-member': { window: 3600, max: 50 },
      },
    },

    // Shared Redis, so the limits above (and sessions) hold across replicas
    // rather than being per-process.
    secondaryStorage: {
      get: (key) => redis.get(`ba:${key}`),
      set: async (key, value, ttl) => {
        if (ttl) await redis.set(`ba:${key}`, value, 'EX', ttl);
        else await redis.set(`ba:${key}`, value);
      },
      delete: async (key) => {
        await redis.del(`ba:${key}`);
      },
    },

    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: AppRole.USER,
          required: false,
          // `input: false` is load-bearing: without it a signup request could
          // set its own role and self-promote to admin.
          input: false,
        },
      },

      // GDPR erasure. Deletion is confirmed by email rather than done on the
      // strength of a session alone, so a stolen session cannot destroy an
      // account. Cascades remove sessions, accounts, and memberships.
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async ({ user, url }) => {
          await emailService.send(EmailType.ACCOUNT_DELETION, {
            to: user.email,
            params: { url, name: user.name, appName },
          });
        },
        afterDelete: async (user) => {
          await audit.log({
            action: 'USER_DELETED',
            actorId: user.id,
            resource: 'user',
            resourceId: user.id,
          });
        },
      },
    },

    // Security-relevant events land in audit_logs. These hooks fire inside
    // better-auth, which is the only place that sees them — a controller
    // decorator could not, because better-auth bypasses Nest's pipeline.
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await audit.log({
              action: 'USER_CREATED',
              actorId: user.id,
              resource: 'user',
              resourceId: user.id,
            });
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await audit.log({
              action: 'SESSION_CREATED',
              actorId: session.userId,
              resource: 'session',
              resourceId: session.id,
              ipAddress: session.ipAddress ?? undefined,
            });
          },
        },
      },
    },

    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        creatorRole: 'owner',
        invitationExpiresIn: parseTtlSeconds(
          config.get<string>('auth.invitationExpiration') ?? '7d',
          7 * 86400
        ),
        cancelPendingInvitationsOnReInvite: true,
        sendInvitationEmail: async ({
          id,
          email,
          role,
          organization,
          inviter,
        }) => {
          const acceptUrl = `${clientUrls[0] ?? ''}/accept-invitation/${id}`;
          await emailService.send(EmailType.INVITATION, {
            to: email,
            params: {
              url: acceptUrl,
              invitationId: id,
              role,
              organizationName: organization.name,
              inviterName: inviter.user.name,
              inviterEmail: inviter.user.email,
              appName,
            },
          });
        },
      }),
      // Lets clients authenticate with `Authorization: Bearer <session token>`
      // instead of a cookie — this is what mobile uses.
      bearer(),
    ],
  });
}

/**
 * The concrete auth instance type, including plugin endpoints and the `role`
 * additional field. The exported `Auth` type from better-auth is the *plugin-less*
 * shape, so annotating with it silently drops every organization endpoint.
 */
export type AppAuth = Awaited<ReturnType<typeof createAuth>>;

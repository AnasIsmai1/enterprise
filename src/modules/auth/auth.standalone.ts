import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import configuration from '@/shared/config/configuration';
import { createAuth } from './auth.config';
import type { EmailService } from '@/external/email/email.service';
import type { AuditLogService } from '@/modules/audit/audit.service';

/**
 * Builds an auth instance outside the Nest container, for CLI entry points
 * (`pnpm db:seed`, `pnpm auth:sql`).
 *
 * Those run under tsx (esbuild), which cannot emit decorator metadata, so Nest's
 * type-based DI cannot resolve providers there. The collaborators that only
 * matter for request handling are stubbed: a seed sends no mail and its audit
 * rows would be noise.
 *
 * Returns the auth instance plus a `close()` — Redis keeps the process alive
 * otherwise.
 */
export async function createStandaloneAuth() {
  const config = new ConfigService(configuration());

  const redis = new Redis({
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    // A CLI should fail fast rather than retry forever against a dead Redis.
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  const emailStub = {
    send: () => Promise.resolve(),
  } as unknown as EmailService;

  const auditStub = {
    log: () => Promise.resolve(),
  } as unknown as AuditLogService;

  const auth = await createAuth(config, emailStub, auditStub, redis);

  return {
    auth,
    config,
    close: async () => {
      redis.disconnect();
      await Promise.resolve();
    },
  };
}

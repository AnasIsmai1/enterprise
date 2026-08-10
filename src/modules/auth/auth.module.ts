import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { EmailModule } from '@/external/email/email.module';
import { EmailService } from '@/external/email/email.service';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuditLogService } from '@/modules/audit/audit.service';
import { BETTER_AUTH, createAuth } from './auth.config';
import { AuthGuard } from './auth.guard';
import { OrgRolesGuard } from './org-roles.guard';

/**
 * Global so guards anywhere can inject the auth instance without re-importing.
 * The factory is async because better-auth is ESM and loaded via dynamic import.
 *
 * There is no controller here on purpose: better-auth serves every auth and
 * organization route itself under /api/auth/*, mounted in main.ts. Adding Nest
 * controllers that proxy them would be duplication.
 */
@Global()
@Module({
  imports: [EmailModule, AuditModule],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [ConfigService, EmailService, AuditLogService, 'REDIS_CLIENT'],
      useFactory: (
        config: ConfigService,
        email: EmailService,
        audit: AuditLogService,
        redis: Redis
      ) => createAuth(config, email, audit, redis),
    },
    AuthGuard,
    OrgRolesGuard,
  ],
  exports: [BETTER_AUTH, AuthGuard, OrgRolesGuard],
})
export class AuthModule {}

import { Controller, Get, Header } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuditLogService } from '@/modules/audit/audit.service';

/**
 * GDPR Article 15 (access) and Article 20 (portability).
 *
 * Erasure (Article 17) is better-auth's `DELETE /api/auth/delete-user`, which
 * confirms by email before destroying anything.
 */
@ApiTags('account')
@ApiBearerAuth('access-token')
@Controller('account')
export class AccountController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditLogService
  ) {}

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="account-export.json"')
  @ApiOperation({
    summary: 'Export everything held about the caller',
    description:
      'Machine-readable JSON of the account, its organization memberships, and audit trail.',
  })
  @ApiResponse({ status: 200, description: 'Export document' })
  async export(@CurrentUser('id') userId: string) {
    // Raw SQL because the identity tables belong to better-auth and are not
    // modelled as TypeORM entities. Read-only and parameterised.
    const [user] = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, name, email, "emailVerified", image, role, "createdAt", "updatedAt"
       FROM "user" WHERE id = $1`,
      [userId]
    );

    const memberships = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT m.id, m.role, m."createdAt", o.id AS organization_id, o.name AS organization_name, o.slug
       FROM member m JOIN organization o ON o.id = m."organizationId"
       WHERE m."userId" = $1`,
      [userId]
    );

    const sessions = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT id, "createdAt", "expiresAt", "ipAddress", "userAgent"
       FROM session WHERE "userId" = $1`,
      [userId]
    );

    // Deliberately excluded: password hashes and OAuth tokens from `account`,
    // and the `verification` table. Exporting a credential is not portability.
    const providers = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT "providerId", "createdAt" FROM account WHERE "userId" = $1`,
      [userId]
    );

    const auditTrail = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT action, resource, resource_id, organization_id, ip_address, timestamp
       FROM audit_logs WHERE actor_id = $1 ORDER BY timestamp DESC LIMIT 1000`,
      [userId]
    );

    await this.audit.log({
      action: 'ACCOUNT_EXPORTED',
      actorId: userId,
      resource: 'user',
      resourceId: userId,
    });

    return {
      exported_at: new Date().toISOString(),
      user,
      memberships,
      sessions,
      linked_providers: providers,
      audit_trail: auditTrail,
      notes: [
        'Password hashes and OAuth tokens are intentionally excluded.',
        'Audit trail is capped at the 1000 most recent entries.',
      ],
    };
  }
}

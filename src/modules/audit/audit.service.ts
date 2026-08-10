import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

/**
 * Audit log service — SEC-14.
 *
 * Provides log() method for recording auth events and admin actions.
 * Exported from @Global() AuditModule so any module can inject it.
 *
 * Usage:
 *   constructor(private readonly auditLog: AuditLogService) {}
 *   await this.auditLog.log({ action: 'LOGIN', actorId: user.id, resource: 'user', resourceId: user.id })
 */
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>
  ) {}

  async log(params: {
    action: string;
    actorId?: string;
    resource: string;
    resourceId?: string;
    organizationId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.auditRepository.save(
      this.auditRepository.create({
        action: params.action,
        actor_id: params.actorId,
        resource: params.resource,
        resource_id: params.resourceId,
        organization_id: params.organizationId,
        ip_address: params.ipAddress,
      })
    );
  }
}

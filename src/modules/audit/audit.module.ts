import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit.entity';
import { AuditLogService } from './audit.service';

/**
 * Global audit module — SEC-14.
 *
 * @Global() makes AuditLogService available throughout the application
 * without needing to import AuditModule in every feature module.
 *
 * Exports AuditLogService for injection in auth, admin, and other modules.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}

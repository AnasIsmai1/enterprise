import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Audit log entity — SEC-14.
 *
 * Stores auth events and admin actions for security auditing.
 * 90-day retention: cleanup cron to be added in a later phase.
 *
 * NOTE: Does NOT extend BaseEntity — uses custom `timestamp` field
 * instead of created_at/updated_at. Manages its own id column.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  action: string; // 'LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'DATA_ACCESS', 'ADMIN_ACTION', etc.

  // text, not uuid: better-auth generates its own string ids for user rows, so a
  // uuid column here would reject every real actor id.
  @Index()
  @Column({ type: 'text', nullable: true })
  actor_id: string; // user performing the action (null for system events)

  @Column({ type: 'varchar', length: 100 })
  resource: string; // 'user', 'organization', 'invitation', etc.

  @Column({ type: 'text', nullable: true })
  resource_id: string;

  // Which tenant the action belongs to, when it is org-scoped.
  @Index()
  @Column({ type: 'text', nullable: true })
  organization_id: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}

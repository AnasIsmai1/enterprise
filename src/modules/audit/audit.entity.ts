import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'uuid', nullable: true })
  actor_id: string; // user performing the action (null for system events)

  @Column({ type: 'varchar', length: 100 })
  resource: string; // 'user', 'pet', 'subscription', etc.

  @Column({ type: 'uuid', nullable: true })
  resource_id: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp: Date;
}

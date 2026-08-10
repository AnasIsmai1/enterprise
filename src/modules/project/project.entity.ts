import { BaseEntity } from '@/shared/domain/base.entity';
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';

/**
 * Reference org-owned resource.
 *
 * This module exists to demonstrate the tenancy pattern every other org-scoped
 * feature should copy. Delete it, or rename it into your first real resource.
 *
 * `organization_id` is text, not uuid: better-auth generates its own string ids.
 * There is no FK to `organization` because that table belongs to better-auth's
 * migration chain; the index carries the query weight either way.
 */
@Entity('projects')
@Index(['organization_id', 'created_at'])
export class Project extends BaseEntity {
  @Index()
  @Column({ type: 'text' })
  organization_id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** better-auth user id of the creator. */
  @Column({ type: 'text' })
  created_by: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at?: Date;
}

import { Column, Entity } from "typeorm";
import { BaseEntity } from "@/shared/domain/base.entity";

export enum Action {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    MANAGE = 'manage',
}

export enum Subject {
    USER = 'User',
    ORGANIZATION = 'Organization',
    TASK = 'Task',
    ALL = 'all'
}

@Entity('permissions')
export class Permission extends BaseEntity {
    @Column({ type: "enum", enum: Action })
    action: Action;

    @Column({ type: "enum", enum: Subject })
    subject: Subject;

    @Column({ type: "text", nullable: true })
    description?: string;
}

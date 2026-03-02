import { Column, Entity, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { BaseEntity } from "@/shared/domain/base.entity";
import { Permission } from "./permission.entity";
import { UserRoles } from "./user_role.entity";

export enum Roles {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    MANAGER = 'manager',
    MEMBER = 'member',
}

@Entity('roles')
export class Role extends BaseEntity {
    @Column({ type: "enum", enum: Roles, unique: true })
    name: Roles;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToMany(() => Permission, { eager: true })
    @JoinTable({
        name: 'role_permissions',
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' }
    })
    permissions: Permission[];

    @OneToMany(() => UserRoles, (userRole: UserRoles) => userRole.role)
    userRoles: UserRoles[]
}

import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/shared/domain/base.entity";
import { Organization } from "@/modules/organizations/core/entities/organization.entity";
import { Users } from "./user.entity";
import { Role } from "./role.entity";

@Entity('user_roles')
export class UserRoles extends BaseEntity {
    @ManyToOne(() => Users, user => user.userRoles)
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @Column("uuid")
    user_id: string;

    @ManyToOne(() => Organization, org => org.userRoles, { nullable: true })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column("uuid", { nullable: true })
    organization_id?: string | null;

    @ManyToOne(() => Role, role => role.userRoles)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column("uuid")
    role_id: string;
}

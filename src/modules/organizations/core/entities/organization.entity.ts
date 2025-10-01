import { UserRoles } from "@/modules/user/core/entities/user_role.entity";
import { BaseEntity } from "@/shared/domain/base.entity";
import { Column, Entity, OneToMany } from "typeorm";
import { Invites } from "./invites.entity";

@Entity('organizations')
export class Organization extends BaseEntity {
    @Column({ type: "varchar", length: 50, unique: true })
    name: string;

    @OneToMany(() => UserRoles, userRoles => userRoles.organization)
    userRoles: UserRoles[]

    @OneToMany(() => Invites, invite => invite.organization)
    invites: Invites[]
}

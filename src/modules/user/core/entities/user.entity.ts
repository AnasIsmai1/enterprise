import { BaseEntity } from "@/shared/domain/base.entity";
import { Exclude } from "class-transformer";
import { Column, Entity, OneToMany } from "typeorm";
import { UserRoles } from "./user_role.entity";
import { UserOtp } from "./user_otp.entity";

export enum UserStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    INVITED = 'invited',
    SUSPENDED = 'suspended',
    DISABLED = 'disabled',
    DELETED = 'deleted',
}

@Entity('users')
export class Users extends BaseEntity {
    @Column("varchar", { nullable: true, length: 20 })
    username?: string;

    @Column("varchar", { length: 20 })
    firstName: string;

    @Column("varchar", { length: 30 })
    lastName: string;

    @Column("varchar", { unique: true, length: 50 })
    email: string;

    @Exclude()
    @Column("varchar", { length: 100 })
    password: string;

    @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
    status: string;

    @Column({ type: 'timestamp', nullable: true })
    deletedAt?: Date;

    @OneToMany(() => UserRoles, userRole => userRole.user)
    userRoles: UserRoles[];

    @OneToMany(() => UserOtp, otp => otp.user)
    otps: UserOtp[];
}

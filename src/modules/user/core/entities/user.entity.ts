import { BaseEntity } from "@/shared/domain/base.entity";
import { Exclude } from "class-transformer";
import { Column, Entity, OneToMany } from "typeorm";
import { UserOtp } from "./user_otp.entity";

export enum UserStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    INVITED = 'invited',
    SUSPENDED = 'suspended',
    DISABLED = 'disabled',
    DELETED = 'deleted',
}

export enum UserRole {
    FREE = 'free',
    PREMIUM = 'premium',
    SUPERADMIN = 'superadmin',
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
    status: UserStatus;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.FREE })
    role: UserRole;

    @Column({ type: 'timestamp with time zone', nullable: true })
    deletedAt?: Date;

    @OneToMany(() => UserOtp, otp => otp.user)
    otps: UserOtp[];
}

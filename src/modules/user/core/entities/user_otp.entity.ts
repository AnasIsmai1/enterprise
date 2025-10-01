import { BaseEntity } from "@/shared/domain/base.entity";
import { BeforeInsert, Column, Entity, ManyToOne } from "typeorm";
import { Users } from "./user.entity";

export enum OtpType {
    SIGNUP = 'signup',
    PASSWORD_RESET = 'password_reset',
    TWO_FACTOR = 'two_factor',
}

@Entity('user_otps')
export class UserOtp extends BaseEntity {
    @ManyToOne(() => Users, user => user.otps, { onDelete: 'CASCADE', nullable: true })
    user?: Users;

    @Column("varchar", { length: 10 })
    otp: string;

    @Column("enum", { enum: OtpType })
    type: OtpType;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ type: 'boolean', default: false })
    used: boolean;

    @Column({ type: 'timestamp', nullable: true })
    usedAt?: Date;

    @Column({ type: 'varchar', length: 100, nullable: true })
    email?: string;

    @BeforeInsert()
    setExpiresAt() {
        if (!this.expiresAt) {
            this.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        }
    }
}

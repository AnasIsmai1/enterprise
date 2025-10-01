import { BaseEntity } from "@/shared/domain/base.entity";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { Organization } from "./organization.entity";

export enum InviteStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    DECLINED = "declined",
    EXPIRED = "expired",
}

@Entity('invites')
export class Invites extends BaseEntity {
    @Column("varchar", { length: 100 })
    email: string;

    @Column("uuid")
    inviterId: string;

    @ManyToOne(() => Organization, organization => organization.invites, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "organization_id" })
    organization: Organization;

    @Column("uuid")
    organization_id: string;

    @Column("uuid", { nullable: true })
    role_id: string;

    @Column("varchar", { length: 255 })
    token: string;

    @Column("enum", { enum: InviteStatus, default: InviteStatus.PENDING })
    status: InviteStatus;

    @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
    sentAt: Date;

    @Column("timestamp", { nullable: true })
    respondedAt?: Date;

    @Column("timestamp", { nullable: true })
    expiresAt?: Date;
}

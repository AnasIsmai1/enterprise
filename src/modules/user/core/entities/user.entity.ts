import { BaseEntity } from "@/shared/domain/base.entity";
import { Exclude } from "class-transformer";
import { Column, Entity } from "typeorm";

@Entity()
export class Users extends BaseEntity {
    @Column("varchar", {
        nullable: true,
        length: 20
    })
    username?: string

    @Column("varchar", {
        length: 20
    })
    firstName: string;

    @Column("varchar", {
        length: 30
    })
    lastName: string;

    @Column("varchar", {
        unique: true,
        length: 50
    })
    email: string;

    @Exclude()
    @Column("varchar", {
        length: 50,
    })
    password: string;
}

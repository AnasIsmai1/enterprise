import { Invites } from "@/modules/organizations/core/entities/invites.entity";
import { Organization } from "@/modules/organizations/core/entities/organization.entity";
import { Permission } from "@/modules/user/core/entities/permission.entity";
import { Role } from "@/modules/user/core/entities/role.entity";
import { Users } from "@/modules/user/core/entities/user.entity";
import { UserOtp } from "@/modules/user/core/entities/user_otp.entity";
import { UserRoles } from "@/modules/user/core/entities/user_role.entity";
import { config } from "dotenv";
import { DataSource } from "typeorm";
config()

const SeedDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [Users, UserRoles, Role, Permission, Organization, Invites, UserOtp],
    synchronize: true
});

export default SeedDataSource;

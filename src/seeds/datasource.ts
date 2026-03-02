import { Invites } from '@/modules/organizations/core/entities/invites.entity';
import { Organization } from '@/modules/organizations/core/entities/organization.entity';
import { Permission } from '@/modules/user/core/entities/permission.entity';
import { Role } from '@/modules/user/core/entities/role.entity';
import { Users } from '@/modules/user/core/entities/user.entity';
import { UserOtp } from '@/modules/user/core/entities/user_otp.entity';
import { UserRoles } from '@/modules/user/core/entities/user_role.entity';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const enableSSL = process.env.DB_SSL === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const SeedDataSource = new DataSource({
  type: (process.env.DB_TYPE as 'postgres' | 'mysql') || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'enterprise',
  ssl: enableSSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
  entities: [Users, UserRoles, Role, Permission, Organization, Invites, UserOtp],
  synchronize: !isProduction,
  logging: ['error', 'warn'],
});

export default SeedDataSource;

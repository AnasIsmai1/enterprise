import { DataSource } from 'typeorm';
import { config } from 'dotenv';
// Use relative imports for TypeORM CLI compatibility
import { Users } from '../../modules/user/core/entities/user.entity';
import { UserOtp } from '../../modules/user/core/entities/user_otp.entity';
import { Role } from '../../modules/user/core/entities/role.entity';
import { Permission } from '../../modules/user/core/entities/permission.entity';
import { UserRoles } from '../../modules/user/core/entities/user_role.entity';
import { Organization } from '../../modules/organizations/core/entities/organization.entity';
import { Invites } from '../../modules/organizations/core/entities/invites.entity';

config();

const enableSSL = process.env.DB_SSL === 'true';

const typeormDataSource = new DataSource({
  type: (process.env.DB_TYPE as 'postgres' | 'mysql') || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: enableSSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
  entities: [Users, UserOtp, Role, Permission, UserRoles, Organization, Invites],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  migrationsTableName: 'enterprise_migrations',
  synchronize: false,
  logging: ['error', 'warn'],
});

export default typeormDataSource;

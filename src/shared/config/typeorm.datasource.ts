import 'dotenv/config';
import { DataSource } from 'typeorm';
// Use relative imports for TypeORM CLI compatibility
import { Users } from '../../modules/user/core/entities/user.entity';
import { UserOtp } from '../../modules/user/core/entities/user_otp.entity';

const typeormDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'poshpet',
  entities: [Users, UserOtp],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  migrationsTableName: 'poshpet_migrations',
  synchronize: false,
  logging: ['error', 'warn'],
});

export default typeormDataSource;

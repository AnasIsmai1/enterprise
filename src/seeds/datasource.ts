import { Users } from '@/modules/user/core/entities/user.entity';
import { UserOtp } from '@/modules/user/core/entities/user_otp.entity';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const SeedDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'poshpet',
  entities: [Users, UserOtp],
  synchronize: false,
  logging: ['error', 'warn'],
});

export default SeedDataSource;

import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * TypeORM owns application tables only. Identity tables (user, session, account,
 * verification, organization, member, invitation) belong to better-auth and are
 * created by the same migration chain — see the InitialSchema migration — but
 * are not modelled as entities here.
 */
const typeormDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'enterprise',
  // A glob, not a hand-maintained list. A list drifts silently, and a missing
  // entity makes `migration:generate` emit an empty diff instead of the table
  // you just added. Mirrors autoLoadEntities in AppModule.
  entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: ['error', 'warn'],
});

export default typeormDataSource;

import { Environment } from './env.validation';

interface BrevoConfig {
  api_key?: string;
  email?: string;
  email_name?: string;
}

interface DatabaseConfig {
  type?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: string;
}

interface SwaggerConfig {
  title: string;
  description: string;
  version: string | number;
  route: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface AuthConfig {
  jwt_secret: string;
  jwt_expiration: string;
  jwt_refresh_expiration: string;
}

interface AppConfig {
  client_url: string;
  port: number;
  env: string;
}

export default (): {
  app: AppConfig;
  auth: AuthConfig;
  swagger: SwaggerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  brevo: BrevoConfig;
} => ({
  app: {
    client_url:
      process.env.CLIENT_URL ?? 'http://localhost:3001, http://localhost:3000',
    port: parseInt(process.env.PORT ?? '5500', 10),
    env: process.env.NODE_ENV ?? Environment.Development,
  },
  auth: {
    jwt_secret:
      process.env.JWT_SECRET ?? 'your-secret-key-change-in-production',
    jwt_expiration: process.env.JWT_EXPIRATION ?? '15m',
    jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
  swagger: {
    title: 'Enterprise API',
    description: 'Enterprise API Documentation',
    version: 1,
    route: 'api/docs',
  },
  database: {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    name: process.env.DB_NAME ?? 'postgres',
    ssl: process.env.DB_SSL ?? 'false',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  },
  brevo: {
    api_key: process.env.BREVO_API_KEY,
    email: process.env.BREVO_EMAIL,
    email_name: process.env.BREVO_EMAIL_NAME,
  },
});

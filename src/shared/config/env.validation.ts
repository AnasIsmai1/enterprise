import { IsEnum, IsNumber, IsString, IsEmail, Min, validateSync } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class AppConfigDto {
  // App (3)
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  PORT: number;

  @IsString()
  CLIENT_URL: string;

  // Database (5)
  @IsString()
  DB_HOST: string;

  @Type(() => Number)
  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASS: string;

  @IsString()
  DB_NAME: string;

  // Redis (2)
  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsNumber()
  REDIS_PORT: number;

  // Cloudflare R2 - media/static (3)
  @IsString()
  R2_ENDPOINT: string;

  @IsString()
  R2_ACCESS_KEY: string;

  @IsString()
  R2_SECRET_KEY: string;

  // Cloudflare R2 - capsule bucket (2)
  @IsString()
  R2_CAPSULE_ACCESS_KEY: string;

  @IsString()
  R2_CAPSULE_SECRET_KEY: string;

  // Brevo (3)
  @IsString()
  BREVO_API_KEY: string;

  @IsString()
  BREVO_SENDER_EMAIL: string;

  @IsString()
  BREVO_SENDER_NAME: string;

  // Sentry (1)
  @IsString()
  SENTRY_DSN: string;

  // Admin (1)
  @IsEmail()
  ADMIN_EMAIL: string;

  // JWT (for Phase 2 auth)
  @IsString()
  JWT_SECRET: string;
}

export default function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(AppConfigDto, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }
  return validatedConfig;
}

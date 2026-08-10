import {
  IsEnum,
  IsNumber,
  IsString,
  IsEmail,
  IsOptional,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
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

  // Branding — the one knob to rebrand this API for a new product.
  @IsOptional()
  @IsString()
  APP_NAME?: string;

  // Public origin of this API. better-auth builds email verification, password
  // reset, and invitation links from it — a wrong value produces links that
  // point at localhost in production.
  @IsOptional()
  @IsString()
  BETTER_AUTH_URL?: string;

  // Defaults to JWT_SECRET when unset.
  @IsOptional()
  @IsString()
  @MinLength(32)
  BETTER_AUTH_SECRET?: string;

  @IsOptional()
  @IsString()
  AUTH_REQUIRE_EMAIL_VERIFICATION?: string;

  @IsOptional()
  @IsString()
  AUTH_SESSION_EXPIRATION?: string;

  @IsOptional()
  @IsString()
  AUTH_INVITATION_EXPIRATION?: string;

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

  // JWT — required. 32 chars minimum: a short secret is brute-forceable and
  // there is no signal at runtime that it happened.
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRATION?: string;

  // --- Optional integrations -------------------------------------------------
  // Not required to boot. The owning service throws when actually used without
  // them, so `pnpm start:dev` works with only Postgres and Redis available.

  // Cloudflare R2 — media/static
  @IsOptional()
  @IsString()
  R2_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  R2_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  R2_SECRET_KEY?: string;

  // Cloudflare R2 — restricted bucket (separate IAM credentials)
  @IsOptional()
  @IsString()
  R2_RESTRICTED_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  R2_RESTRICTED_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_MEDIA?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_RESTRICTED?: string;

  @IsOptional()
  @IsString()
  R2_BUCKET_STATIC?: string;

  // Brevo transactional email
  @IsOptional()
  @IsString()
  BREVO_API_KEY?: string;

  @IsOptional()
  @IsEmail()
  BREVO_SENDER_EMAIL?: string;

  @IsOptional()
  @IsString()
  BREVO_SENDER_NAME?: string;

  // Sentry
  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  // Admin
  @IsOptional()
  @IsEmail()
  ADMIN_EMAIL?: string;
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
        .join('\n')}`
    );
  }
  return validatedConfig;
}

import { IsEnum, IsNumber, IsString, Min, IsDefined, MinLength, IsOptional } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Logger } from '@nestjs/common';

export enum Environment {
    Development = 'development',
    Production = 'production',
}

export class AppConfigDto {
    // App
    @IsDefined()
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsDefined()
    @IsNumber()
    @Min(0)
    PORT: number;

    // Auth
    @IsDefined()
    @IsString()
    @MinLength(5)
    SESSION_SECRET: string;

    // Database
    @IsDefined()
    @IsString()
    DB_HOST: string;

    @IsDefined()
    @IsNumber()
    DB_PORT: number;

    @IsDefined()
    @IsString()
    DB_USER: string;

    @IsDefined()
    @IsString()
    DB_PASS: string;

    @IsDefined()
    @IsString()
    DB_NAME: string;

    // Redis
    @IsDefined()
    @IsString()
    REDIS_HOST: string;

    @IsDefined()
    @IsNumber()
    @Min(0)
    REDIS_PORT: number;

    @IsOptional()
    @IsString()
    REDIS_PASSWORD: string;

    // Email
    @IsOptional()
    @IsString()
    @MinLength(1)
    BREVO_API_KEY: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    BREVO_EMAIL: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    BREVO_EMAIL_NAME: string;
}

export default function validateConfig(config: Record<string, any>) {
    const validatedConfig = plainToInstance(AppConfigDto, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    // Warn if BREVO credentials are missing
    if (
        !validatedConfig.BREVO_API_KEY ||
        !validatedConfig.BREVO_EMAIL ||
        !validatedConfig.BREVO_EMAIL_NAME
    ) {
        Logger.warn(
            'BREVO credentials are missing. Email service will not work without BREVO_API_KEY, BREVO_EMAIL, and BREVO_EMAIL_NAME.',
            'ConfigValidation'
        );
    }

    return validatedConfig;
}

import { IsEnum, IsNumber, IsString, Min, IsDefined } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export enum Environment {
    Development = 'development',
    Production = 'production',
}

export class AppConfigDto {
    @IsDefined()
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsDefined()
    @IsNumber()
    @Min(0)
    PORT: number;

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
}

export default function validateConfig(config: Record<string, any>) {
    const validatedConfig = plainToInstance(AppConfigDto, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    return validatedConfig;
}

import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module';

import configuration from '@/shared/config/configuration';
import validate from '@/shared/config/env.validation';
// ResponseInterceptor moved to src/common/interceptors/response.interceptor.ts — wired in main.ts
import { RequestLoggerMiddleware } from '@/shared/middleware/logging/logging.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SharedModule } from '@/shared/shared.module';
import { RedisModule } from '@/external/redis/redis.module';
import { StorageModule } from '@/external/storage/storage.module';
import { EmailModule } from '@/external/email/email.module';
import { AuthModule } from '@/modules/auth/presentation/auth.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuditModule } from '@/modules/audit/audit.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [configuration],
            validate: validate,
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const isProduction =
                    configService.get<string>('app.nodeEnv') === 'production';

                return {
                    type: 'postgres',
                    host: configService.get<string>('database.host'),
                    port: configService.get<number>('database.port'),
                    username: configService.get<string>('database.user'),
                    password: configService.get<string>('database.password'),
                    database: configService.get<string>('database.name'),
                    autoLoadEntities: true,
                    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
                    migrationsTableName: 'poshpet_migrations',
                    logging: isProduction
                        ? ['error', 'warn']
                        : ['error', 'warn', 'info', 'log', 'query'],
                    synchronize: false,
                };
            },
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.get('redis.host'),
                    port: config.get('redis.port'),
                },
            }),
        }),
        // API-10, API-11, API-12: Rate limiting — 100 req/min globally per user
        // NOTE: nestjs-throttler-storage-redis not installed yet; using default in-memory store.
        // For distributed/stateless rate limiting (INFRA-07), install nestjs-throttler-storage-redis
        // and add: storage: new ThrottlerStorageRedisService(redisClient)
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (_config: ConfigService) => ({
                throttlers: [
                    {
                        name: 'default',
                        ttl: 60000,  // 1 minute
                        limit: 100, // API-10: 100 req/min per authenticated user
                    },
                ],
                // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
                // are included automatically by @nestjs/throttler v5+ (API-12)
            }),
        }),
        StorageModule,
        EmailModule,
        RedisModule,
        HealthModule,
        AuditModule,
        AuthModule,
        SharedModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Global filters via APP_FILTER — AllExceptionsFilter registered first (lower priority),
        // HttpExceptionFilter registered second (higher priority — catches HttpExceptions first).
        // NestJS applies filters in reverse registration order.
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        // API-10, API-11, API-12: Global rate limiting guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('*');
    }
}

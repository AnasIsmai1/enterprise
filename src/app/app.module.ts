import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module';

import configuration from '@/shared/config/configuration';
import validate from '@/shared/config/env.validation';
import { databaseConnection } from '@/shared/config/database.config';
// ResponseInterceptor moved to src/common/interceptors/response.interceptor.ts — wired in main.ts
import { AppLoggingModule } from '@/shared/logging/logging.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SharedModule } from '@/shared/shared.module';
import { RedisModule } from '@/external/redis/redis.module';
import { StorageModule } from '@/external/storage/storage.module';
import { EmailModule } from '@/external/email/email.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AuditModule } from '@/modules/audit/audit.module';
import { ProjectModule } from '@/modules/project/project.module';
import { AccountModule } from '@/modules/account/account.module';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate: validate,
      isGlobal: true,
    }),
    AppLoggingModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('app.nodeEnv') === 'production';

        const db = databaseConnection(configService);

        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.database,
          ssl: db.ssl,
          autoLoadEntities: true,
          migrations: [__dirname + '/../migrations/*{.ts,.js}'],
          migrationsTableName: 'migrations',
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
    // API-10, API-11, API-12: 100 req/min per caller, backed by Redis so the
    // limit is shared across instances (INFRA-07). An in-memory store would
    // multiply the effective limit by the replica count.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
          })
        ),
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
    AccountModule,
    // Reference implementation of an org-scoped resource — see project.service.ts.
    ProjectModule,
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
    // Authentication is default-on: every route requires a session unless it
    // carries @Public(). AuthGuard must precede RolesGuard, which reads the
    // req.user it populates.
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

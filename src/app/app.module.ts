import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module';

import configuration from '@/shared/config/configuration';
import validate from '@/shared/config/env.validation';
import { ResponseInterceptor } from '@/shared/interceptors/response/response.interceptor';
import { RequestLoggerMiddleware } from '@/shared/middleware/logging/logging.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';
import { RedisModule } from '@/external/redis/redis.module';
import { StorageModule } from '@/external/storage/storage.module';
import { EmailModule } from '@/external/email/email.module';
import { AuthModule } from '@/modules/auth/presentation/auth.module';

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
        StorageModule,
        EmailModule,
        RedisModule,
        HealthModule,
        AuthModule,
        SharedModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        ResponseInterceptor,
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('*');
    }
}

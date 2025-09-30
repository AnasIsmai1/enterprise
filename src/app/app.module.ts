import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module';

import configuration from '@/shared/config/configuration';
import validate, { Environment } from '@/shared/config/env.validation';
import { ResponseInterceptor } from '@/shared/interceptors/response/response.interceptor';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RequestLoggerMiddleware } from '@/shared/middleware/logging/logging.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [configuration],
            validate: validate,
            isGlobal: true,
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', 'src', 'app', 'assets'),
            serveRoot: '/assets',
            serveStaticOptions: {
                index: false,
            },
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: configService.get<'mysql' | 'postgres' | 'aurora-mysql'>('database.type', 'postgres'),
                host: configService.get<string>('database.host'),
                port: configService.get<number>('database.port'),
                username: configService.get<string>('database.username'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.name'),

                // autoLoadEntities: true,

                entities: ["**/modules/*/core/entities/*.entity{.ts,.js}"],
                migrations: ["**/migrations/*{.ts,.js}"],

                logging: ['error', 'warn', 'info', 'log', 'query'],

                synchronize: configService.get<string>('app.env') === Environment.Development,
                ssl: configService.get<string>('app.env') === Environment.Production,
            })
        }),
        HealthModule,
        SharedModule
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

import * as Sentry from '@sentry/nestjs';

// SEC-01: TLS 1.3 is enforced at the Cloudflare reverse proxy layer.
// The NestJS app runs behind Cloudflare and does not terminate TLS directly.
// Ensure Cloudflare SSL/TLS settings are set to "Full (strict)" with minimum TLS 1.3.

// INFRA-06, SEC-06: Initialize Sentry BEFORE NestFactory.create()
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Only 5xx errors are captured — 4xx filtering happens in AllExceptionsFilter
  });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './shared/config/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['debug', 'log', 'warn'],
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 5500);

  // Security (SEC-02 - HSTS via helmet)
  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  // CORS using CLIENT_URL from env (SEC-04)
  const clientUrl = configService.get<string>('app.clientUrl') ?? '';
  app.enableCors({
    origin: clientUrl.split(',').map((s) => s.trim()).filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // URI versioning (API-01)
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  // Global exception filters (API-05, SEC-06, SEC-07, SEC-08)
  // CRITICAL order: AllExceptionsFilter FIRST, HttpExceptionFilter SECOND.
  // NestJS applies filters in reverse registration order, so HttpExceptionFilter
  // executes first (catches HttpExceptions), AllExceptionsFilter catches everything else.
  // Note: AllExceptionsFilter and HttpExceptionFilter are also registered via APP_FILTER
  // in AppModule for DI (ConfigService injection). The useGlobalFilters here is for
  // cases where DI-based filters need manual instantiation. Using APP_FILTER approach
  // in app.module.ts is the primary registration; these lines can be removed if DI works.
  //
  // Since we use APP_FILTER in app.module.ts (which supports DI), we don't need
  // useGlobalFilters here — but we keep LoggingInterceptor and ResponseInterceptor.

  // Global interceptors — LoggingInterceptor wraps outer, ResponseInterceptor wraps inner
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // Global validation pipe (API-14, API-16)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  setupSwagger(app, configService);
  await app.listen(port, '0.0.0.0');

  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const host = nodeEnv === 'production' ? '0.0.0.0' : 'localhost';
  const baseUrl = `http://${host}:${port}`;
  const docsRoute = configService.get<string>('swagger.route', 'api/docs');

  Logger.log(`Environment: ${nodeEnv}`, 'APP');
  Logger.log(`Server:      ${baseUrl}`, 'APP');
  Logger.log(`API Docs:    ${baseUrl}/${docsRoute}`, 'APP');
}

bootstrap().catch((err) => {
  Logger.fatal('Bootstrap error:', err, 'APP');
  process.exit(1);
});

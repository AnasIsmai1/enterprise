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
import cookieParser from 'cookie-parser';
import { Logger as PinoLogger } from 'nestjs-pino';
import express from 'express';
import type { AppAuth } from '@/modules/auth/auth.config';
import { BETTER_AUTH } from './modules/auth/auth.config';

/** better-auth mounts here; Nest's own routes live under /api/v1. */
const AUTH_BASE_PATH = '/api/auth';

async function bootstrap() {
  // bodyParser: false is required. better-auth's handler reads the raw request
  // stream; if Express has already consumed the body, every POST to /api/auth/*
  // hangs. JSON parsing is re-enabled below, AFTER the auth handler is mounted.
  const app = await NestFactory.create(AppModule, {
    // bufferLogs holds startup logs until pino is resolved below, so boot output
    // goes through the same formatter as everything else.
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 5500);

  // Security (SEC-02 - HSTS via helmet)
  app.use(helmet());
  app.use(cookieParser());

  // better-auth owns /api/auth/* — sign-up, sign-in, sessions, email
  // verification, password reset, organizations, members, and invitations.
  // Mounted as raw Express middleware so it bypasses Nest's pipeline entirely.
  const { toNodeHandler } = await import('better-auth/node');
  app.use(AUTH_BASE_PATH, toNodeHandler(app.get<AppAuth>(BETTER_AUTH)));

  // Body parsing for everything else, now that the auth handler has its stream.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api');

  // CORS using CLIENT_URL from env (SEC-04)
  const clientUrl = configService.get<string>('app.clientUrl') ?? '';
  app.enableCors({
    origin: clientUrl
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // URI versioning (API-01)
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  // Exception filters are registered via APP_FILTER in AppModule so they can
  // inject ConfigService and EmailService.

  // Wraps every handler return value in { success, data }.
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global validation pipe (API-14, API-16)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
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

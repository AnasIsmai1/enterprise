import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './shared/config/swagger';
import { ResponseInterceptor } from './shared/interceptors/response/response.interceptor';
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

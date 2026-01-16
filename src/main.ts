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

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: configService.get<string>('app.client_url')?.split(',').map(s => s.trim()) || '*',
    methods: 'GET,HEAD,PUT,POST,DELETE,OPTS',
    credentials: true,
  });
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );
  app.enableShutdownHooks();

  app.use(helmet());
  app.use(cookieParser());

  setupSwagger(app, configService);
  await app.listen(port, '0.0.0.0');

  const env = configService.get<string>('app.env', 'development');
  const host = env === 'production' ? '0.0.0.0' : 'localhost';
  const baseUrl = `http://${host}:${port}`;
  const docsRoute = configService.get<string>('swagger.route', 'api/docs');

  Logger.log(`Environment: ${env}`, 'APP');
  Logger.log(`Server:      ${baseUrl}`, 'APP');
  Logger.log(`API Docs:    ${baseUrl}/${docsRoute}`, 'APP');
}

bootstrap().catch((err) => {
  Logger.fatal('Bootstrap error:', err, 'APP');
  process.exit(1);
});

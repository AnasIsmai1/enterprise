import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './shared/config/swagger';
import { ResponseInterceptor } from './shared/interceptors/response/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['debug', 'log', 'warn'],
        bufferLogs: true,
        bodyParser: false, // Required for Better Auth
    });

    const configService = app.get(ConfigService)
    const port = configService.get<number>('app.port', 3000)

    app.setGlobalPrefix('api')
    app.enableCors({
        origin: "*",
        methods: "GET,HEAD,PUT,POST,DELETE,OPTS",
        credentials: true
    })
    app.enableVersioning({
        defaultVersion: '1',
        type: VersioningType.URI
    })
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true
        })
    )
    app.enableShutdownHooks()

    app.use(helmet())
    setupSwagger(app, configService);
    await app.listen(port);
    Logger.log(`The Server is running at ${await app.getUrl()}`, 'APP')
}
bootstrap().catch((err) => {
    Logger.fatal('Bootstrap error:', err, 'APP');
    process.exit(1)
});

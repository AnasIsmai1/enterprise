import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export const setupSwagger = (app: INestApplication, configService: ConfigService) => {
    const options = new DocumentBuilder()
        .setTitle(configService.get('swagger.title', 'PoshPet API'))
        .setDescription(configService.get('swagger.description', 'PoshPet API Documentation'))
        .setVersion(configService.get('swagger.version', '1'))
        .addCookieAuth()
        .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(configService.get<string>('swagger.route', 'api/docs'), app, document, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'PoshPet API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            syntaxHighlight: {
                theme: 'monokai',
            },
        },
    });
};

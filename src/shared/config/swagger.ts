import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export const setupSwagger = (app: INestApplication, configService: ConfigService) => {
    const options = new DocumentBuilder()
        .setTitle(configService.get('swagger.title', ''))
        .setDescription(configService.get('swagger.description', ''))
        .setVersion(configService.get('swagger.version', ''))
        .addCookieAuth()
        .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(configService.get<string>('swagger.route', ''), app, document, {
        customCss: '.swagger-ui .topbar { display: none }',
        customCssUrl: '/assets/swagger.css',
        customSiteTitle: 'Enterprise API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            syntaxHighlight: {
                theme: 'monokai'
            }
        },
    });
};

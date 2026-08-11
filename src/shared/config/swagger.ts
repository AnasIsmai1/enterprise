import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Swagger/OpenAPI configuration — INFRA-04.
 *
 * Title/description come from config so a fork does not have to edit code.
 * Accessible at /api/docs (configurable via swagger.route env).
 */
export const setupSwagger = (
  app: INestApplication,
  configService: ConfigService
) => {
  const options = new DocumentBuilder()
    .setTitle(configService.get<string>('swagger.title', 'Enterprise API'))
    .setDescription(
      configService.get<string>(
        'swagger.description',
        'Enterprise API Documentation'
      )
    )
    .setVersion('1.0')
    // Bearer token auth (JWT) — use Authorize button with "Bearer <token>"
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token'
    )
    // Cookie auth (for session-based flows)
    .addCookieAuth()
    // API group tags
    // Only tags with real controllers. better-auth serves /api/auth/* outside
    // Nest entirely, so it cannot appear in this document at all.
    .addTag('account', 'GDPR data export')
    .addTag('projects', 'Reference organization-scoped resource')
    .addTag('health', 'Liveness and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(
    configService.get<string>('swagger.route', 'api/docs'),
    app,
    document,
    {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: configService.get<string>(
        'swagger.description',
        'API Documentation'
      ),
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        syntaxHighlight: {
          theme: 'monokai',
        },
      },
    }
  );
};

import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Swagger/OpenAPI configuration — INFRA-04.
 *
 * PoshPet branding with Bearer JWT auth support.
 * Accessible at /api/docs (configurable via swagger.route env).
 */
export const setupSwagger = (
  app: INestApplication,
  configService: ConfigService,
) => {
  const options = new DocumentBuilder()
    .setTitle('PoshPet API')
    .setDescription('PoshPet Luxury Pet Care Planner API')
    .setVersion('1.0')
    // Bearer token auth (JWT) — use Authorize button with "Bearer <token>"
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    // Cookie auth (for session-based flows)
    .addCookieAuth()
    // API group tags
    .addTag('auth', 'Authentication — register, login, refresh, logout')
    .addTag('users', 'User profile management')
    .addTag('pets', 'Pet management')
    .addTag('tasks', 'Daily care task management')
    .addTag('health', 'Application health checks')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(
    configService.get<string>('swagger.route', 'api/docs'),
    app,
    document,
    {
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
    },
  );
};

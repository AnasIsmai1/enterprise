export default () => ({
  app: {
    // Single rebranding knob: APP_NAME flows into Swagger, email sender name,
    // and anywhere else the product is named. Nothing hardcodes a product.
    name: process.env.APP_NAME ?? 'Enterprise API',
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '5500', 10),
    clientUrl: process.env.CLIENT_URL,
  },
  auth: {
    // better-auth signing secret. Falls back to JWT_SECRET so an existing .env
    // keeps working after the migration.
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
    // Public origin of this API. better-auth builds verification / reset /
    // invitation links from it, so it must be the externally reachable URL.
    baseUrl:
      process.env.BETTER_AUTH_URL ??
      `http://localhost:${process.env.PORT ?? '5500'}`,
    requireEmailVerification:
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== 'false',
    sessionExpiration: process.env.AUTH_SESSION_EXPIRATION ?? '7d',
    invitationExpiration: process.env.AUTH_INVITATION_EXPIRATION ?? '7d',
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    name: process.env.DB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  storage: {
    r2Endpoint: process.env.R2_ENDPOINT,
    r2AccessKey: process.env.R2_ACCESS_KEY,
    r2SecretKey: process.env.R2_SECRET_KEY,
    r2RestrictedAccessKey: process.env.R2_RESTRICTED_ACCESS_KEY,
    r2RestrictedSecretKey: process.env.R2_RESTRICTED_SECRET_KEY,
    buckets: {
      MEDIA: process.env.R2_BUCKET_MEDIA,
      RESTRICTED: process.env.R2_BUCKET_RESTRICTED,
      STATIC: process.env.R2_BUCKET_STATIC,
    },
  },
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.BREVO_SENDER_EMAIL,
    senderName: process.env.BREVO_SENDER_NAME,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION ?? '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
  log: {
    level: process.env.LOG_LEVEL,
  },
  health: {
    // Ceilings for the /health probe. Defaults are deliberately generous — a
    // probe that flaps on a healthy process is worse than no probe.
    heapLimitMb: parseInt(process.env.HEALTH_HEAP_LIMIT_MB ?? '512', 10),
    diskThreshold: Number(process.env.HEALTH_DISK_THRESHOLD ?? '0.9'),
  },
  swagger: {
    title:
      process.env.SWAGGER_TITLE ?? process.env.APP_NAME ?? 'Enterprise API',
    description:
      process.env.SWAGGER_DESCRIPTION ??
      `${process.env.APP_NAME ?? 'Enterprise API'} Documentation`,
    version: 1,
    route: process.env.SWAGGER_ROUTE ?? 'api/docs',
  },
});

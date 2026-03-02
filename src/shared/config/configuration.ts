export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '5500', 10),
    clientUrl: process.env.CLIENT_URL,
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
    r2CapsuleAccessKey: process.env.R2_CAPSULE_ACCESS_KEY,
    r2CapsuleSecretKey: process.env.R2_CAPSULE_SECRET_KEY,
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
  swagger: {
    title: 'PoshPet API',
    description: 'PoshPet API Documentation',
    version: 1,
    route: 'api/docs',
  },
});

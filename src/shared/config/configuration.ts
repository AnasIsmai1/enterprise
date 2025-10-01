import { Environment } from "./env.validation";

interface BrevoConfig {
    api_key?: string;
    email?: string;
    email_name?: string;
}

interface DatabaseConfig {
    type?: string;
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
}

interface SwaggerConfig {
    title: string;
    description: string;
    version: string | number;
    route: string;
}

interface RedisConfig {
    host: string,
    port: number
    password?: string;
}

interface AuthConfig {
    session_secret: string;
}

interface AppConfig {
    port: number;
    env: string;
}

export default (): {
    app: AppConfig;
    auth: AuthConfig;
    swagger: SwaggerConfig;
    database: DatabaseConfig;
    redis: RedisConfig;
    brevo: BrevoConfig;
} => ({
    app: {
        port: parseInt(process.env.PORT ?? '3000', 10),
        env: process.env.NODE_ENV ?? Environment.Development,
    },
    auth: {
        session_secret: process.env.SESSION_SECRET ?? 'default-sample-secret'
    },
    swagger: {
        title: 'Flowchain',
        description: 'Template for docs',
        version: 1,
        route: 'api/docs',
    },
    database: {
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASS ?? '',
        name: process.env.DB_NAME ?? 'postgres',
    },
    redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD
    },
    brevo: {
        api_key: process.env.BREVO_API_KEY,
        email: process.env.BREVO_EMAIL,
        email_name: process.env.BREVO_EMAIL_NAME,
    }
});

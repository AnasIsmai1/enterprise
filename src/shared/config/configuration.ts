import { Environment } from "./env.validation";

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

interface AppConfig {
    port: number;
    env: string;
}

export default (): {
    app: AppConfig;
    swagger: SwaggerConfig;
    database: DatabaseConfig;
} => ({
    app: {
        port: parseInt(process.env.PORT ?? '3000', 10),
        env: process.env.NODE_ENV ?? Environment.Development,
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
});

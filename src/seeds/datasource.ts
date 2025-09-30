import { Users } from "@/modules/user/core/entities/user.entity";
import { config } from "dotenv";
import { DataSource } from "typeorm";
config()

const SeedDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [Users],
    synchronize: true
});

export default SeedDataSource;

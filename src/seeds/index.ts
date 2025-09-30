import { Logger } from '@nestjs/common';
import { seedUsers } from '@/seeds/user.seed';
import SeedDataSource from './datasource';

const logger = new Logger('Seeder');

async function main() {
    try {
        logger.log('Initializing database connection...');
        await SeedDataSource.initialize();
        logger.log('Database connection established.');

        logger.log('Starting seeding process...');
        await seedUsers();
        logger.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Seeding failed:', error.stack);
        process.exit(1);
    }
}
main();

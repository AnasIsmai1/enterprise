import { Logger } from '@nestjs/common';
import { seedUser } from '@/seeds/user.seed';
import SeedDataSource from './datasource';

const logger = new Logger('Seeder');

async function main() {
    try {
        logger.log('Initializing database connection...');
        await SeedDataSource.initialize();
        logger.log('Database connection established.');

        logger.log('Starting seeding process...');
        await seedUser(SeedDataSource);
        logger.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Seeding failed:', error.stack ?? error);
        process.exit(1);
    } finally {
        if (SeedDataSource.isInitialized) {
            await SeedDataSource.destroy();
            logger.log('Database connection closed.');
        }
    }
}

main();

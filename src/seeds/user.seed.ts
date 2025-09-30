import { Logger } from '@nestjs/common';
import { Users } from '@mod/user/core/entities/user.entity';
import SeedDataSource from './datasource';

export const users: Partial<Users>[] = [
    {
        username: "anas",
        firstName: "Anas",
        lastName: "Ismail",
        email: "anas@example.com",
        password: "password123",
    },
    {
        username: "jane",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com",
        password: "securepass456",
    },
    {
        username: "johnny",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        password: "johnspass789",
    },
    {
        username: "sara",
        firstName: "Sara",
        lastName: "Lee",
        email: "sara.lee@example.com",
        password: "sarapassword",
    },
];

const logger = new Logger('SeedUsers');

export async function seedUsers() {
    try {
        const userRepository = SeedDataSource.getRepository(Users);

        for (const user of users) {
            const existingUser = await userRepository.find({ where: { email: user.email } });
            if (existingUser) {
                logger.error(`User with email ${user.email} already exists. Skipping.`);
                continue;
            }
            try {
                await userRepository.save(user);
            } catch (err) {
                logger.error(`Failed to seed User ${user.email}: ${err}`);
            }
        }

        logger.log('Seeded users');
    } catch (error) {
        logger.error('Failed to seed users', error.stack);
        throw error;
    }
}

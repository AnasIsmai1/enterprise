import { Logger } from '@nestjs/common';
import { Users, UserStatus } from '@mod/user/core/entities/user.entity';
import { UserRoles } from '@mod/user/core/entities/user_role.entity';
import { Role, Roles } from '@mod/user/core/entities/role.entity';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { seedRolesAndPermissions } from './authroritzation.seed';

const logger = new Logger('SeedUsers');

export const adminUser: Partial<Users> = {
    username: "flowchain",
    firstName: "Admin",
    lastName: "Flowchain",
    email: "admin@flowchain.com",
    password: "password123",
};

export async function seedUser(datasource: DataSource) {
    try {
        // 1. Make sure roles and permissions are seeded first
        await seedRolesAndPermissions(datasource);

        const userRepository = datasource.getRepository(Users);
        const roleRepository = datasource.getRepository(Role);
        const userRolesRepository = datasource.getRepository(UserRoles);

        // 2. Check if user already exists
        const existingUser = await userRepository.findOne({ where: { email: adminUser.email } });
        let savedUser: Users;
        if (existingUser) {
            logger.warn(`User with email ${adminUser.email} already exists. Skipping user creation.`);
            savedUser = existingUser;
        } else {
            // 3. Hash the password before saving
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminUser.password!, saltRounds);

            const userToSave = {
                ...adminUser,
                password: hashedPassword,
                status: UserStatus.ACTIVE,
            };

            try {
                savedUser = await userRepository.save(userToSave);
                logger.log(`Seeded admin user: ${adminUser.email}`);
            } catch (err) {
                logger.error(`Failed to seed admin user ${adminUser.email}: ${err}`);
                return;
            }
        }

        // 4. Assign SUPER_ADMIN role (with organization_id: null)
        const superAdminRole: Role | null = await roleRepository.findOne({ where: { name: Roles.SUPER_ADMIN } });
        if (!superAdminRole) {
            logger.error('SUPER_ADMIN role not found!');
            return;
        }

        // IMPORTANT: role_id is a string (uuid)!
        const existingUserRole = await userRolesRepository.findOne({
            where: {
                user_id: savedUser.id,
                role_id: superAdminRole.id,
            }
        });

        if (existingUserRole) {
            logger.warn('User already has SUPER_ADMIN role. Skipping role assignment.');
        } else {
            const userRole = userRolesRepository.create({
                user_id: savedUser.id,
                role_id: superAdminRole.id,
                organization_id: null,
            });
            await userRolesRepository.save(userRole);
            logger.log('Assigned SUPER_ADMIN role to user.');
        }

    } catch (error) {
        logger.error('Failed to seed admin user', error.stack);
        throw error;
    }
}

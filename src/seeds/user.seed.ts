import { Logger } from '@nestjs/common';
import { Users, UserStatus, UserRole } from '@mod/user/core/entities/user.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const logger = new Logger('SeedUsers');

export const adminUser: Partial<Users> = {
  username: 'admin',
  firstName: 'Admin',
  lastName: 'PoshPet',
  email: process.env.ADMIN_EMAIL || 'admin@poshpet.local',
  password: 'ChangeMe123!',
};

export async function seedUser(datasource: DataSource) {
  try {
    const userRepository = datasource.getRepository(Users);

    // Check if admin user already exists
    const existingUser = await userRepository.findOne({
      where: { email: adminUser.email },
    });

    if (existingUser) {
      logger.warn(
        `User with email ${adminUser.email} already exists. Skipping user creation.`
      );
      return;
    }

    // Hash the password before saving
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminUser.password!, saltRounds);

    const userToSave = userRepository.create({
      ...adminUser,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      role: UserRole.SUPERADMIN,
    });

    await userRepository.save(userToSave);
    logger.log(`Seeded admin user: ${adminUser.email}`);
  } catch (error) {
    logger.error('Failed to seed admin user', error.stack);
    throw error;
  }
}

import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from '@mod/user/application';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../core/entities/permission.entity';
import { Role } from '../core/entities/role.entity';
import { UserOtp } from '../core/entities/user_otp.entity';
import { UserRoles } from '../core/entities/user_role.entity';
import { Users } from '../core/entities/user.entity';
import { UserRepository } from '../infrastructure/repositories/user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Permission,
            Role,
            UserOtp,
            UserRoles,
            Users
        ])
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService, UserRepository],
})
export class UserModule { }

import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from '@mod/user/application';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOtp } from '../core/entities/user_otp.entity';
import { Users } from '../core/entities/user.entity';
import { UserRepository } from '../infrastructure/repositories/user.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserOtp,
            Users,
        ])
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService, UserRepository],
})
export class UserModule { }

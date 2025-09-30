import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from '@mod/user/application';

@Module({
    controllers: [UserController],
    providers: [UserService]
})
export class UserModule { }

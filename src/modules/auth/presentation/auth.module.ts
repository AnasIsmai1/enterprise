import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from '@/modules/user/presentation/user.module';

@Module({
    // imports: [UserModule],
    controllers: [AuthController]
})
export class AuthModule { }

import { UserService } from '@/modules/user/application';
import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from '../../application/dtos/Login.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    // constructor(private readonly userService: UserService) { }

    @Post()
    @ApiOperation({ summary: 'User login', description: 'Authenticate user and create session cookie.' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                message: 'Login successful',
                user: {
                    id: 'uuid',
                    email: 'user@example.com',
                    roles: ['super_admin'],
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() loginData: LoginDto,
        @Req() req,
    ) {
        // const user = await this.userService.findByEmail(loginData.email);
        // if (!user) {
        //     throw new UnauthorizedException('Invalid credentials');
        // }

        // const isMatch = await bcrypt.compare(loginData.password, user.password);
        // if (!isMatch) {
        //     throw new UnauthorizedException('Invalid credentials');
        // }

        // req.session.user = {
        //     id: user.id,
        //     email: user.email,
        //     roles: user.userRoles?.map(r => r.role?.name) || [],
        // };
        //
        // return {
        //     message: 'Login successful',
        //     user: {
        //         id: user.id,
        //         email: user.email,
        //         roles: user.userRoles?.map(r => r.role?.name) || [],
        //     },
        // };
    }
}

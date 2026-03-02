import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class UserService {

    constructor(private readonly userRepository: UserRepository) { }

    async findByEmail(email: string) {
        const user = await this.userRepository.findByEmail(email);

        if (!user)
            throw new NotFoundException('User not found');

        return user;
    }
}

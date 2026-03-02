import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '@/shared/domain/base.repository';
import { IUserRepository } from '@mod/user/core/interfaces/repositories/user.repositories';
import { Users } from '@mod/user/core/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<Users> implements IUserRepository {
    constructor(
        @InjectRepository(Users)
        repo: Repository<Users>,
    ) {
        super(repo.target, repo.manager, repo.queryRunner);
    }

    async findByEmail(email: string): Promise<Users | null> {
        return this.findOne({
            where: { email },
            relations: ['userRoles', 'userRoles.role'],
        });
    }
}

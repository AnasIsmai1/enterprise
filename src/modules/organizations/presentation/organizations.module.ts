import { Module } from '@nestjs/common';
import { OrganizationsController } from './controllers/organizations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../core/entities/organization.entity';
import { Invites } from '../core/entities/invites.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Organization,
            Invites,
        ])
    ],
    controllers: [OrganizationsController]
})
export class OrganizationsModule { }

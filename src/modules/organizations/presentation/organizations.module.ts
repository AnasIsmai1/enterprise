import { Module } from '@nestjs/common';
import { OrganizationsController } from './controllers/organizations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../core/entities/organization.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Organization
        ])
    ],
    controllers: [OrganizationsController]
})
export class OrganizationsModule { }

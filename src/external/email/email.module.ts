import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { EmailTemplatesService } from './email-templates.service';
import { Environment } from '@/shared/config/env.validation';

const isDev = process.env.NODE_ENV === Environment.Development;

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'EMAIL_TEMPLATE',
            useValue: isDev
                ? join(process.cwd(), 'src', 'external', 'email', 'templates')
                : join(__dirname, 'templates')
        },
        EmailService,
        EmailTemplatesService
    ],
    exports: [EmailService]
})
export class EmailModule { }

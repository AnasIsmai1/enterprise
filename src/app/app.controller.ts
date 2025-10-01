import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from '@/external/email/email.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService, private readonly emailService: EmailService) { }

    @Get()
    getStatus(): string {
        return this.appService.getStatus();
    }

    @Post('email')
    @HttpCode(HttpStatus.NO_CONTENT)
    async testEmail() {
        await this.emailService.sendWelcomeEmail('jidma1911@gmail.com', 'kratos')
    }
}

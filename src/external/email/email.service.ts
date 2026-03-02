import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { EmailTemplatesService } from './email-templates.service';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';
    private readonly axios: AxiosInstance;
    private readonly sender: { email: string; name?: string };

    constructor(
        private readonly templateService: EmailTemplatesService,
        private readonly configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('brevo.api_key');
        this.axios = axios.create({
            baseURL: this.apiUrl,
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        this.sender = {
            email: this.configService.get<string>('brevo.email', 'rollwithcode'),
            name: this.configService.get<string>('brevo.email_name', 'rollwithcode'),
        };
    }

    async sendWelcomeEmail(to: string, username: string) {
        const subject = 'Welcome to Our App!';
        let htmlContent = this.templateService.getTemplate('welcome');
        htmlContent = htmlContent.replace(/{{\s*username\s*}}/g, username);

        return this.sendEmail(to, subject, htmlContent);
    }

    private async sendEmail(
        to: string,
        subject: string,
        htmlContent: string,
        sender = this.sender,
    ): Promise<any> {
        try {
            const payload = {
                sender,
                to: [{ email: to }],
                subject,
                htmlContent,
            };
            const response = await this.axios.post('', payload);
            this.logger.log(`Email sent to ${to}: ${response.statusText}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
            throw new Error('Failed to Send Email');
        }
    }
}

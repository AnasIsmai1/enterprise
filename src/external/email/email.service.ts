import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';
    private readonly axios: AxiosInstance;
    private readonly sender: { email: string; name?: string };

    constructor(
        private readonly configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('email.brevoApiKey');
        this.axios = axios.create({
            baseURL: this.apiUrl,
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        this.sender = {
            email: this.configService.get<string>('email.senderEmail', 'noreply@poshpet.com'),
            name: this.configService.get<string>('email.senderName', 'PoshPet'),
        };
    }

    async sendTransactionalEmail(
        to: string,
        templateId: number,
        params: Record<string, any> = {}
    ): Promise<void> {
        try {
            const payload = {
                sender: this.sender,
                to: [{ email: to }],
                templateId,
                params,
            };
            const response = await this.axios.post('', payload);
            this.logger.log(`Email sent to ${to} (templateId: ${templateId}): ${response.statusText}`);
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
            throw new Error('Failed to Send Email');
        }
    }
}

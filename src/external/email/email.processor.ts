import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJobData, EMAIL_QUEUE, EMAIL_TEMPLATE_IDS } from './email.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SibApiV3Sdk = require('sib-api-v3-sdk');

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);
    private readonly apiInstance: any;

    constructor(private readonly config: ConfigService) {
        super();

        // Configure default Brevo API client with API key
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = this.config.get<string>('email.brevoApiKey');

        this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    }

    async process(job: Job<EmailJobData>): Promise<void> {
        const { type, to, params } = job.data;
        const templateId = EMAIL_TEMPLATE_IDS[type];

        this.logger.log(
            `Processing email job: ${type} to ${to} (template: ${templateId})`,
        );

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.templateId = templateId;
        sendSmtpEmail.params = params;
        sendSmtpEmail.sender = {
            email: this.config.get<string>('email.senderEmail'),
            name: this.config.get<string>('email.senderName'),
        };

        try {
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            this.logger.log(`Email sent successfully: ${type} to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send email: ${type} to ${to}`, error);
            throw error; // Re-throw so BullMQ retries (up to 3 attempts with exponential backoff)
        }
    }
}

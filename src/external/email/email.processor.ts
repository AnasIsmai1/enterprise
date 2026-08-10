import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJobData, EMAIL_QUEUE, resolveTemplateId } from './email.types';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { type, to, params } = job.data;
    const templateId = resolveTemplateId(type);

    this.logger.log(
      `Processing email job: ${type} to ${to} (template: ${templateId})`
    );

    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': this.config.get<string>('email.brevoApiKey') ?? '',
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: to }],
        templateId,
        params,
        sender: {
          email: this.config.get<string>('email.senderEmail'),
          name: this.config.get<string>('email.senderName'),
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `Failed to send email: ${type} to ${to} — ${response.status} ${detail}`
      );
      // Re-throw so BullMQ retries (up to 3 attempts with exponential backoff)
      throw new Error(`Brevo responded ${response.status}: ${detail}`);
    }

    this.logger.log(`Email sent successfully: ${type} to ${to}`);
  }
}

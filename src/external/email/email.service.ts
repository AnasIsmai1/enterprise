import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailType, EMAIL_QUEUE, EmailJobData } from './email.types';

@Injectable()
export class EmailService {
    constructor(
        @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    ) {}

    /**
     * Enqueue an email for async sending via BullMQ.
     * Does NOT call Brevo API directly — the EmailProcessor handles that.
     * BullMQ automatically retries on Brevo API failures.
     *
     * Usage: emailService.send(EmailType.VERIFICATION, { to: 'user@example.com', params: { verificationUrl: '...' } })
     */
    async send(
        type: EmailType,
        payload: { to: string; params: Record<string, any> },
    ): Promise<void> {
        const jobData: EmailJobData = {
            type,
            to: payload.to,
            params: payload.params,
        };

        await this.emailQueue.add(type, jobData, {
            attempts: 3,                                    // Retry 3 times on failure
            backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s delays
            removeOnComplete: true,                         // Clean up successful jobs
            removeOnFail: false,                            // Keep failed jobs for debugging
        });
    }
}

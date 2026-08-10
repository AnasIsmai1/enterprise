import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { ErrorCode, HTTP_STATUS_TO_ERROR_CODE } from '../enums/error-code.enum';
import { EmailService } from '@/external/email/email.service';
import { EmailType } from '@/external/email/email.types';

/**
 * Global catch-all exception filter.
 *
 * Registered BEFORE HttpExceptionFilter in app.useGlobalFilters() (or as APP_FILTER).
 * NestJS applies filters in reverse registration order, so HttpExceptionFilter
 * executes first for HttpExceptions, and this filter catches everything else.
 *
 * - 5xx errors: Reported to Sentry (SEC-06) and logged as error
 * - 4xx errors: Logged locally only (SEC-07)
 * - Critical failures: Trigger Sentry + admin email (SEC-08)
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isDev =
      this.configService.get<string>('app.nodeEnv', 'development') ===
      'development';

    let status: number;
    let errorMessage: string;
    let errorCode: ErrorCode;

    if (exception instanceof HttpException) {
      // This filter is the fallback — HttpExceptionFilter handles HttpExceptions first.
      // This branch handles cases where HttpExceptionFilter is not registered or missed.
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const responseMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message;
      // class-validator returns an array of messages; surface the first.
      errorMessage = Array.isArray(responseMessage)
        ? responseMessage[0]
        : (responseMessage ?? exception.message);
      errorCode = HTTP_STATUS_TO_ERROR_CODE[status] ?? ErrorCode.INTERNAL_ERROR;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = 'An internal server error occurred';
      errorCode = ErrorCode.INTERNAL_ERROR;
    }

    if (status >= 500) {
      // SEC-06: Report 5xx errors to Sentry
      Sentry.captureException(exception);

      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
        AllExceptionsFilter.name
      );

      // SEC-08: Send admin alert email on critical failures (async, non-blocking)
      if (this.isCriticalError(exception)) {
        this.sendAdminAlert(exception, request).catch(() => {
          // Swallow — email module may not be available yet
        });
      }
    } else {
      // SEC-07: 4xx errors are logged locally only (not Sentry)
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status}: ${errorMessage}`,
        AllExceptionsFilter.name
      );
    }

    const body: Record<string, any> = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    };

    // Dev-only debug fields (locked decision from CONTEXT.md)
    if (isDev) {
      body.debug = {
        stack: exception instanceof Error ? exception.stack : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(body);
  }

  /**
   * Determines if an error is critical enough to warrant an admin alert.
   * Critical errors include: database connection failures and TypeORM errors.
   */
  private isCriticalError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;

    const criticalMessages = [
      'Connection refused',
      'ECONNREFUSED',
      'ConnectionNotFoundError',
      'QueryFailedError',
      'FATAL',
      'Cannot connect',
    ];

    return criticalMessages.some(
      (msg) =>
        exception.message?.includes(msg) || exception.constructor?.name === msg
    );
  }

  /**
   * Sends an admin alert email for critical failures (SEC-08, EMAIL-06).
   *
   * Enqueues onto BullMQ rather than calling Brevo inline — an alert must never
   * add latency to, or throw inside, the error path that produced it.
   */
  private async sendAdminAlert(
    exception: unknown,
    request: Request
  ): Promise<void> {
    const adminEmail = this.configService.get<string>('admin.email');
    if (!adminEmail) return;

    const message =
      exception instanceof Error ? exception.message : String(exception);

    try {
      await this.emailService.send(EmailType.ADMIN_ALERT, {
        to: adminEmail,
        params: {
          appName: this.configService.get<string>('app.name', 'API'),
          environment: this.configService.get<string>(
            'app.nodeEnv',
            'development'
          ),
          message,
          path: `${request.method} ${request.url}`,
          stack: exception instanceof Error ? exception.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Alerting must never mask the original failure — log and move on.
      this.logger.error(
        `Failed to enqueue admin alert for: ${message}`,
        error instanceof Error ? error.stack : undefined,
        AllExceptionsFilter.name
      );
    }
  }
}

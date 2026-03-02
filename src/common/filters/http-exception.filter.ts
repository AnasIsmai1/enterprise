import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ErrorCode, HTTP_STATUS_TO_ERROR_CODE } from '../enums/error-code.enum';

/**
 * HTTP exception filter — catches all HttpException instances.
 *
 * Registered AFTER AllExceptionsFilter in app.useGlobalFilters() (or APP_FILTER providers).
 * NestJS applies filters in reverse registration order, so this filter
 * executes FIRST for HttpExceptions. AllExceptionsFilter catches everything else.
 *
 * - Maps HTTP status codes to ErrorCode enum values
 * - Handles NestJS ValidationPipe errors (message arrays)
 * - Includes dev-only debug fields
 */
@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isDev = this.configService.get<string>('app.nodeEnv', 'development') === 'development';
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const errorCode = HTTP_STATUS_TO_ERROR_CODE[status] ?? ErrorCode.INTERNAL_ERROR;

    // Extract message — ValidationPipe returns { message: string[], error: string, statusCode: number }
    let errorMessage: string;
    let field: string | undefined;

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const resp = exceptionResponse as Record<string, any>;

      // Handle NestJS ValidationPipe errors (message is string[])
      if (Array.isArray(resp.message)) {
        errorMessage = resp.message[0];
      } else {
        errorMessage = resp.message || exception.message;
      }

      // Include field if provided (e.g., custom exceptions with field context)
      if (resp.field) {
        field = resp.field;
      }
    } else {
      errorMessage = exception.message;
    }

    // Log 4xx locally only (SEC-07)
    this.logger.warn(
      `[${request.method}] ${request.url} - ${status}: ${errorMessage}`,
      HttpExceptionFilter.name,
    );

    const body: Record<string, any> = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        ...(field && { field }),
      },
    };

    // Dev-only debug fields (locked decision from CONTEXT.md)
    if (isDev) {
      body.debug = {
        stack: exception.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(body);
  }
}

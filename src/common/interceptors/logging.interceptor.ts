import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Structured request/response logging interceptor.
 *
 * Logs method, path, statusCode, duration, and userId as JSON on every request.
 * Sensitive fields (password, token, authorization) are omitted from logs (locked decision).
 *
 * This is DISTINCT from ResponseInterceptor:
 * - LoggingInterceptor: handles structured logging
 * - ResponseInterceptor: handles response envelope wrapping
 *
 * Registration order in main.ts:
 * app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor())
 * LoggingInterceptor is the outer interceptor — it wraps the entire request lifecycle.
 */

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
];

function omitSensitive(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      SENSITIVE_FIELDS.some((f) =>
        key.toLowerCase().includes(f.toLowerCase()),
      )
    ) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Export for use in tests
export { omitSensitive, SENSITIVE_FIELDS };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userId: string = request.user?.id ?? 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              method,
              path: url,
              statusCode: response.statusCode,
              duration: `${duration}ms`,
              userId,
            }),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            JSON.stringify({
              method,
              path: url,
              statusCode: error.status || 500,
              duration: `${duration}ms`,
              userId,
              error: error.message,
            }),
          );
        },
      }),
    );
  }
}

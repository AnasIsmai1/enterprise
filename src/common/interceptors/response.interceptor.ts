import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response interceptor — wraps all successful responses in a standardized envelope.
 *
 * Output formats:
 * - Paginated:  { success: true, data: items[], meta: { page, limit, total, total_pages, has_more } }
 * - Standard:   { success: true, data: any }
 * - Already wrapped: pass-through (response already has 'success' property)
 *
 * This interceptor NEVER handles errors — exception filters handle those.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Pass-through if already wrapped (has 'success' property)
        if (data !== null && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Handle paginated results (from repository — has 'items' and 'meta' properties)
        if (
          data !== null &&
          typeof data === 'object' &&
          'items' in data &&
          'meta' in data
        ) {
          return {
            success: true,
            data: data.items,
            meta: data.meta,
          };
        }

        // Standard response
        return {
          success: true,
          data,
        };
      }),
    );
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map(data => {
                const ctx = context.switchToHttp();
                const response = ctx.getResponse();
                const status = response.statusCode;

                // Default values
                let message = 'Request successful';
                let payload: any = undefined;

                if (data === null || data === undefined) {
                    payload = undefined;
                }
                else if (typeof data === 'string') {
                    message = data;
                }
                else if (Array.isArray(data)) {
                    payload = data;
                }
                else if (typeof data === 'object') {
                    if (data?.message && data.data !== undefined) {
                        message = data.message;
                        payload = data.data;
                    }
                    else if (data?.message) {
                        message = data.message;
                        const { message: _, ...rest } = data;
                        payload = Object.keys(rest).length > 0 ? rest : null;
                    }
                    else {
                        payload = data;
                    }
                }

                return {
                    status,
                    success: status >= 200 && status < 300,
                    message,
                    ...(payload !== undefined && { payload })
                };
            })
        );
    }
}

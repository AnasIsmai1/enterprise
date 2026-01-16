import { Injectable, NestMiddleware, Logger, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { requestToCurl } from '@/shared/utils/request-curl.utils';
import * as os from 'os';

export interface RequestLoggerOptions {
    /** Fields to mask in request body (e.g. 'password', 'token') */
    sensitiveFields?: string[];
    maxBodyLength?: number;
    logHeaders?: boolean;
    useColors?: boolean;
    excludeRoutes?: RegExp[];
    /** Whether to generate curl commands */
    generateCurl?: boolean;
    jsonFormat?: boolean;
}

interface RequestLogData {
    requestId: string;
    timestamp: string;
    method: string;
    url: string;
    path: string;
    protocol: string;
    host: string;
    ip: string;
    userAgent: string;
    contentType: string;
    referrer: string;
    queryParams: Record<string, any>;
    headers?: Record<string, any>;
    body?: any;
    user?: any;
    curl?: string;
    processId: number;
    hostname: string;
    nodeVersion: string;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');
    private options: RequestLoggerOptions = {
        sensitiveFields: [
            'password',
            'token',
            'secret',
            'authorization',
            'current_password',
            'newPassword',
            'api_key',
            'apiKey',
            'key',
            'credentials',
        ],
        maxBodyLength: 10000,
        logHeaders: true,
        useColors: true,
        excludeRoutes: [/^\/health/, /^\/metrics/, /^\/assets/, /^\/favicon\.ico/],
        generateCurl: true,
        jsonFormat: true,
    };

    constructor(@Optional() options?: RequestLoggerOptions) {
        this.options = { ...this.options, ...options };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        if (this.shouldSkipLogging(req.path)) {
            return next();
        }

        // Assign request ID
        const requestId = req.headers['x-request-id'] as string || uuidv4();
        req['id'] = requestId;
        res.setHeader('X-Request-ID', requestId);

        const timestamp = new Date().toISOString();

        // Extract all possible data
        const user = this.extractUserInfo(req);
        const { method, path, body, headers, query, hostname, protocol } = req;
        const url = `${protocol}://${hostname}${req.originalUrl || req.url}`;
        const userAgent = headers['user-agent'] || 'unknown';
        const contentType = headers['content-type'] || 'unknown';
        const referrer = headers['referer'] || 'unknown';
        const clientIp = this.getClientIp(req);

        const sanitizedBody = this.sanitizeBody(body);
        const sanitizedHeaders = this.options.logHeaders ? this.sanitizeHeaders(headers) : undefined;

        // Generate curl command if enabled
        let curlCommand: string | undefined;
        if (this.options.generateCurl) {
            try {
                curlCommand = requestToCurl(req);
            } catch (error) {
                curlCommand = `Error generating curl: ${error.message}`;
            }
        }

        // Create comprehensive log data
        const logData: RequestLogData = {
            requestId,
            timestamp,
            method,
            url,
            path,
            protocol: req.protocol,
            host: req.hostname,
            ip: clientIp,
            userAgent,
            contentType,
            referrer,
            queryParams: query,
            processId: process.pid,
            hostname: os.hostname(),
            nodeVersion: process.version,
            ...(user && { user }),
            ...(this.options.logHeaders && { headers: sanitizedHeaders }),
            ...(Object.keys(sanitizedBody).length > 0 && { body: sanitizedBody }),
            ...(curlCommand && { curl: curlCommand }),
        };

        // Log request data
        this.logRequest(logData);

        // Add minimal response logging - just status code
        res.on('finish', () => {
            const statusCode = res.statusCode;
            const statusColor = this.getStatusColor(statusCode);

            if (!this.options.jsonFormat && this.options.useColors) {
                this.logger.log(
                    `${chalk.dim(`[${requestId}]`)} ${chalk[this.getMethodColor(method)](method)} ${path} ${chalk[statusColor](statusCode)}`
                );
            }
        });

        next();
    }

    private logRequest(logData: RequestLogData): void {
        if (this.options.jsonFormat) {
            this.logger.log(logData);
        } else if (this.options.useColors) {
            this.logRequestColorized(logData);
        }
    }

    private shouldSkipLogging(path: string): boolean {
        return !!this.options.excludeRoutes?.some(pattern => pattern.test(path));
    }

    private getClientIp(req: Request): string {
        return (
            (typeof req.headers['x-forwarded-for'] === 'string' && req.headers['x-forwarded-for'].split(',')[0]) ||
            (typeof req.headers['x-real-ip'] === 'string' && req.headers['x-real-ip']) ||
            req.socket.remoteAddress ||
            'unknown'
        );
    }

    private sanitizeBody(body: any): any {
        if (!body) return {};

        try {
            const clonedBody = JSON.parse(JSON.stringify(body));

            const bodyStr = JSON.stringify(clonedBody);
            if (bodyStr.length > (this.options.maxBodyLength || 10000)) {
                return { _truncated: true, size: bodyStr.length };
            }

            if (this.options.sensitiveFields) {
                this.options.sensitiveFields.forEach(field => {
                    this.maskSensitiveField(clonedBody, field);
                });
            }

            return clonedBody;
        } catch (error) {
            return { _error: 'Could not serialize request body' };
        }
    }

    private maskSensitiveField(obj: any, field: string): void {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            if (key.toLowerCase().includes(field.toLowerCase())) {
                if (typeof obj[key] === 'string') {
                    obj[key] = '********';
                } else if (obj[key] !== null) {
                    obj[key] = '[REDACTED]';
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.maskSensitiveField(obj[key], field);
            }
        });
    }

    private sanitizeHeaders(headers: any): any {
        const sensitizedHeaders = { ...headers };

        if (this.options.sensitiveFields) {
            this.options.sensitiveFields.forEach(field => {
                Object.keys(sensitizedHeaders).forEach(header => {
                    if (header.toLowerCase().includes(field.toLowerCase())) {
                        sensitizedHeaders[header] = '********';
                    }
                });
            });
        }

        // Always mask these headers
        const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'api-key',
            'session',
            'x-auth-token',
            'jwt',
        ];

        sensitiveHeaders.forEach(header => {
            if (sensitizedHeaders[header]) {
                sensitizedHeaders[header] = '********';
            }
        });

        return sensitizedHeaders;
    }

    private extractUserInfo(req: Request): any {
        try {
            if (req['user']) {
                const user = req['user'] as Record<string, any>;
                return {
                    id: user.id || user.sub || 'unknown',
                    username: user.username || user.email || 'unknown',
                    roles: user.roles || user.permissions || [],
                };
            }

            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const base64Payload = token.split('.')[1];
                    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
                    return {
                        id: payload.sub || payload.id || 'unknown',
                        username: payload.username || payload.email || 'unknown',
                        roles: payload.roles || payload.permissions || [],
                    };
                } catch (e) {
                    // Silent fail on token parsing
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private getMethodColor(method: string): string {
        switch (method) {
            case 'GET': return 'blue';
            case 'POST': return 'green';
            case 'PUT': return 'yellow';
            case 'DELETE': return 'red';
            case 'PATCH': return 'magenta';
            default: return 'white';
        }
    }

    private logRequestColorized(logData: RequestLogData): void {
        const { method, path, requestId, ip } = logData;
        const methodColor = this.getMethodColor(method);

        this.logger.log(
            `${chalk.dim(`[${requestId}]`)} ${chalk[methodColor](method)} ${path} ${chalk.dim(`${ip}`)}`,
        );

        if (logData.body && Object.keys(logData.body).length > 0) {
            console.log(chalk.dim('  Body:'), JSON.stringify(logData.body, null, 2));
        }

        if (logData.curl) {
            console.log(chalk.dim('  Curl:'), logData.curl);
        }
    }

    private getStatusColor(status: number): string {
        if (status < 300) return 'green';
        if (status < 400) return 'cyan';
        if (status < 500) return 'yellow';
        return 'red';
    }
}

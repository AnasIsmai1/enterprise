import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Structured request logging.
 *
 * Replaces a hand-rolled middleware + interceptor pair that logged full request
 * bodies and a reconstructed curl command on every request. That was ~380 lines,
 * two passes over each request, and it leaked payloads into logs.
 *
 * - Production: newline-delimited JSON on stdout, for a log shipper to collect.
 * - Development: human-readable, coloured, one line per request.
 * - `X-Request-ID` is honoured if the caller sends one, generated otherwise, and
 *   echoed back — so a single request is one query in whichever sink you use.
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('app.nodeEnv') === 'production';

        return {
          pinoHttp: {
            level: config.get<string>(
              'log.level',
              isProduction ? 'info' : 'debug'
            ),

            // Correlation id: reuse the caller's, else mint one. Echoed on the
            // response so a client can quote it in a bug report.
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const existing = req.headers['x-request-id'];
              const id =
                (Array.isArray(existing) ? existing[0] : existing) ??
                randomUUID();
              res.setHeader('X-Request-ID', id);
              return id;
            },

            // Never log credentials. `remove: true` drops the key entirely
            // rather than writing "[Redacted]", which keeps logs smaller and
            // avoids advertising that a field existed.
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["set-cookie"]',
                'req.headers["x-api-key"]',
                'res.headers["set-cookie"]',
                'req.body.password',
                'req.body.newPassword',
                'req.body.currentPassword',
                'req.body.token',
                'req.body.secret',
              ],
              remove: true,
            },

            // Only the fields worth keeping. The default serialisers dump every
            // header on every line.
            serializers: {
              req: (req: IncomingMessage & { id: string; url: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
            },

            // 4xx is the client's problem, not an error worth paging on.
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },

            autoLogging: {
              // Probes would otherwise dominate the log volume.
              ignore: (req: IncomingMessage) =>
                req.url?.startsWith('/health') === true ||
                req.url?.startsWith('/api/v1/health') === true,
            },

            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggingModule {}

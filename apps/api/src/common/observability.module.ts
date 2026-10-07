import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loadEnv } from '../config/env';

/** Structured JSON logs with correlation IDs; pretty output in development only. */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => {
        const env = loadEnv();
        return {
          pinoHttp: {
            level: env.LOG_LEVEL,
            genReqId: (req, res) => {
              const incoming = req.headers['x-correlation-id'];
              const id = typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
              res.setHeader('x-correlation-id', id);
              return id;
            },
            redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
            autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
            transport:
              env.NODE_ENV === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
                : undefined,
          },
        };
      },
    }),
  ],
})
export class ObservabilityModule {}

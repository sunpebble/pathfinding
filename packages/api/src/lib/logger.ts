import * as pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino.pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

export type Logger = ReturnType<typeof createLogger>;

import pino from 'pino';

/**
 * Structured Logger for AI Service
 *
 * Uses Pino for high-performance structured logging with:
 * - Environment-based log levels
 * - Pretty printing in development
 * - JSON output in production
 * - Child loggers for component isolation
 */

const isDev = process.env.NODE_ENV !== 'production';

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: {
    service: 'ai-service',
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Create transport for pretty printing in dev
const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

// Create the root logger
export const logger = pino({
  ...baseConfig,
  ...(transport && { transport }),
});

/**
 * Create a child logger for a specific component
 *
 * @example
 * const crawlerLogger = createLogger('crawler');
 * crawlerLogger.info({ url }, 'Starting crawl');
 */
export function createLogger(component: string) {
  return logger.child({ component });
}

/**
 * Create a request-scoped logger with request ID
 *
 * @example
 * const reqLogger = createRequestLogger('abc123', 'crawler');
 * reqLogger.info('Processing request');
 */
export function createRequestLogger(requestId: string, component?: string) {
  return logger.child({
    requestId,
    ...(component && { component }),
  });
}

// Pre-configured component loggers for common use cases
export const loggers = {
  crawler: createLogger('crawler'),
  agent: createLogger('agent'),
  ai: createLogger('ai'),
  weather: createLogger('weather'),
  transport: createLogger('transport'),
  translations: createLogger('translations'),
  convex: createLogger('convex'),
  langgraph: createLogger('langgraph'),
};

export default logger;

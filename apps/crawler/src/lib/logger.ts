/**
 * Logger Utility
 * Unified logging system using Pino with structured output
 */

import { createLogger as createPinoLogger } from '@pathfinding/logger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error | null, context?: LogContext) => void;
  child: (prefix: string) => Logger;
}

/**
 * Adapt a Pino logger to our Logger interface
 */
function adaptPinoLogger(
  pinoLogger: ReturnType<typeof createPinoLogger>
): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      pinoLogger.debug(context ?? {}, message);
    },

    info(message: string, context?: LogContext): void {
      pinoLogger.info(context ?? {}, message);
    },

    warn(message: string, context?: LogContext): void {
      pinoLogger.warn(context ?? {}, message);
    },

    error(message: string, error?: Error | null, context?: LogContext): void {
      if (error) {
        pinoLogger.error(
          {
            ...context,
            err: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          },
          message
        );
      } else {
        pinoLogger.error(context ?? {}, message);
      }
    },

    child(childPrefix: string): Logger {
      return adaptPinoLogger(pinoLogger.child({ subcontext: childPrefix }));
    },
  };
}

/**
 * Create a logger instance with optional prefix
 */
export function createLogger(prefix?: string): Logger {
  const pinoLogger = createPinoLogger(prefix ?? 'app');
  return adaptPinoLogger(pinoLogger);
}

// Default logger instance
export const logger = createLogger();

// Pre-configured loggers for common modules
export const workerLogger = createLogger('Worker');
export const ollamaLogger = createLogger('Ollama');
export const enrichLogger = createLogger('Enrich');
export const geocodeLogger = createLogger('Geocode');
export const crawlerLogger = createLogger('Crawler');
export const translationLogger = createLogger('Translation');
export const chatLogger = createLogger('Chat');

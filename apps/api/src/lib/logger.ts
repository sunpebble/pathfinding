/**
 * Logger Utility
 * Unified logging system with structured output and log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (prefix: string) => Logger;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'info' in production, 'debug' in development
const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Enable JSON output for structured logging in production
const useJsonOutput =
  process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[currentLevel];
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }
  return ` ${JSON.stringify(context)}`;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  prefix?: string;
  message: string;
  context?: LogContext;
}

function formatStructuredLog(
  level: LogLevel,
  message: string,
  prefix?: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();

  if (useJsonOutput) {
    const log: StructuredLog = {
      timestamp,
      level,
      message,
    };
    if (prefix) {
      log.prefix = prefix;
    }
    if (context && Object.keys(context).length > 0) {
      log.context = context;
    }
    return JSON.stringify(log);
  }

  // Human-readable format for development
  const prefixStr = prefix ? `[${prefix}] ` : '';
  const contextStr = formatContext(context);
  return `[${timestamp}] [${level.toUpperCase()}] ${prefixStr}${message}${contextStr}`;
}

/**
 * Create a logger instance with optional prefix
 */
export function createLogger(prefix?: string): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (shouldLog('debug')) {
        // eslint-disable-next-line no-console
        console.debug(formatStructuredLog('debug', message, prefix, context));
      }
    },

    info(message: string, context?: LogContext): void {
      if (shouldLog('info')) {
        // eslint-disable-next-line no-console
        console.info(formatStructuredLog('info', message, prefix, context));
      }
    },

    warn(message: string, context?: LogContext): void {
      if (shouldLog('warn')) {
         
        console.warn(formatStructuredLog('warn', message, prefix, context));
      }
    },

    error(message: string, context?: LogContext): void {
      if (shouldLog('error')) {
         
        console.error(formatStructuredLog('error', message, prefix, context));
      }
    },

    child(childPrefix: string): Logger {
      const newPrefix = prefix ? `${prefix}:${childPrefix}` : childPrefix;
      return createLogger(newPrefix);
    },
  };
}

// Default logger instance
export const logger = createLogger('API');

// Pre-configured loggers for common modules
export const budgetLogger = createLogger('Budget');
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');

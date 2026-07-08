import pino from 'pino';

// pino 默认目标走 sonic-boom → fs.writeSync，在 Cloudflare Workers 的 nodejs_compat
// 下会抛 TypeError("offset must be number")；pino-pretty 还依赖 Node worker 线程，
// workerd 也不支持。故统一把日志写到 console（wrangler tail 可捕获 console 输出）。
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV !== 'production' ? 'debug' : 'info');

const consoleDestination: pino.DestinationStream = {
  write(msg: string) {
    console.log(msg);
  },
};

export const logger = pino({ level }, consoleDestination);

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

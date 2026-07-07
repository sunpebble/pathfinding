import * as pino from 'pino';

// pino 实例在模块加载期创建一次。LOG_LEVEL / NODE_ENV 均非密钥，属启动期
// 一次性配置（日志详细度、是否启用 pino-pretty），不随请求变化，故保留
// process.env 读取。鉴权/密钥类配置须走 c.env（见 services/auth.service.ts）。
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

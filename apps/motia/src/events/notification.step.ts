import { z } from 'zod';

const _inputSchema = z.object({
  type: z.enum(['email', 'push', 'webhook']),
  recipient: z.string(),
  subject: z.string().optional(),
  message: z.string(),
});

export const config = {
  type: 'event',
  name: 'NotificationSend',
  description: '发送通知',
  subscribes: ['notification.send'],
  emits: ['notification.sent', 'notification.failed'],
  flows: ['notification'],
};

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: { info: (msg: string, data?: unknown) => void; error: (msg: string, data?: unknown) => void };
}

export async function handler(input: z.infer<typeof _inputSchema>, { emit, logger }: HandlerContext) {
  const { type, recipient, subject: _subject, message: _message } = input;

  try {
    logger.info('Sending notification', { type, recipient });
    await emit({ topic: 'notification.sent', data: { type, recipient, timestamp: new Date().toISOString() } });
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Notification failed';
    logger.error('Notification failed', { error: errorMessage });
    await emit({ topic: 'notification.failed', data: { type, recipient, error: errorMessage } });
  }
}

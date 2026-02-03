export const config = {
  type: 'cron',
  name: 'PollPendingGuides',
  description: '轮询待处理攻略',
  cron: '*/30 * * * * *',
  emits: ['guide.enrichment.requested'],
  flows: ['enrichment'],
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>
  logger: { info: (msg: string, data?: unknown) => void }
}

export async function handler({ emit: _emit, logger }: HandlerContext) {
  logger.info('Polling for pending guides')
  // Simplified: just log for now
  logger.info('Poll completed - no pending guides (simplified mode)')
}

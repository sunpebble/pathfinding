import { z } from 'zod';

function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'gemma3:latest',
  };
}

async function callOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const config = getOllamaConfig();
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const response = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, prompt: fullPrompt, stream: false }),
  });

  if (!response.ok)
    throw new Error(`Ollama API error: ${response.status}`);
  const data = await response.json();
  return data.response?.trim() || '';
}

const bodySchema = z.object({
  message: z.string().min(1),
  context: z.string().optional(),
});

export const config = {
  type: 'api',
  name: 'AiChat',
  description: 'AI 聊天服务',
  path: '/api/ai/chat',
  method: 'POST',
  emits: [],
  flows: ['ai'],
  bodySchema,
};

interface HandlerContext {
  logger: { info: (msg: string, data?: unknown) => void; error: (msg: string, data?: unknown) => void };
}

export async function handler(req: { body?: unknown }, { logger }: HandlerContext) {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success)
    return { status: 400, body: { error: 'Message is required' } };

  const { message, context } = parseResult.data;

  try {
    logger.info('Processing chat', { len: message.length });
    const systemPrompt = context ? `你是旅行助手。背景：\n\n${context}` : '你是旅行助手。';
    const response = await callOllama(message, systemPrompt);
    return { status: 200, body: { success: true, response } };
  }
  catch (error) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    logger.error('Chat failed', { error: msg });
    return { status: 500, body: { error: msg } };
  }
}

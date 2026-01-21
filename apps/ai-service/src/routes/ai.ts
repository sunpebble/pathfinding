/**
 * AI Processing Routes
 * API endpoints for AI-powered content extraction and summarization
 * Refactored to use LangChain.js with Claude Opus 4.5
 */

import { Hono } from 'hono';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM, getProvidersStatus } from '../lib/llm/index.js';

export const aiRouter = new Hono();

/**
 * Get the configured LLM instance
 */
function getLLM() {
  return createLLM();
}

/**
 * Call LLM with a prompt
 */
async function callLLM(prompt: string, systemPrompt?: string): Promise<string> {
  const llm = getLLM();
  const messages = [];

  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  messages.push(new HumanMessage(prompt));

  const response = await llm.invoke(messages);
  return typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);
}

// Health check
aiRouter.get('/health', async (c) => {
  const status = await getProvidersStatus();

  const currentProvider = process.env.LLM_PROVIDER || 'claude';
  const providerStatus = status[currentProvider as keyof typeof status];
  const isHealthy = providerStatus?.available ?? false;

  return c.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      provider: currentProvider,
      model: process.env.ANTHROPIC_MODEL || process.env.OLLAMA_MODEL,
      services: status,
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  );
});

// Get available providers status
aiRouter.get('/providers', async (c) => {
  const status = await getProvidersStatus();
  return c.json({
    providers: status,
    current: process.env.LLM_PROVIDER || 'claude',
  });
});

// Summarize content
aiRouter.post('/summarize', async (c) => {
  try {
    const { content, maxLength = 500 } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const systemPrompt = '你是一个专业的内容摘要助手，擅长提取和总结关键信息。';
    const prompt = `请用中文总结以下内容，限制在${maxLength}字以内，突出关键信息：

${content}`;

    const summary = await callLLM(prompt, systemPrompt);
    return c.json({ success: true, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Summarization failed';
    return c.json({ error: message }, 500);
  }
});

// Extract POIs from content
aiRouter.post('/extract-pois', async (c) => {
  try {
    const { content } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const systemPrompt = `你是一个旅行信息提取专家。你的任务是从旅行内容中提取所有地点信息，并以JSON数组格式返回。
只返回JSON数组，不要包含任何其他文字说明。`;

    const prompt = `从以下旅行内容中提取所有景点、餐厅、住宿等地点信息：

${content}

请返回JSON数组，每个元素包含：
- name: 地点名称
- type: 类型（attraction/restaurant/hotel/transportation）
- description: 简短描述

只返回JSON数组：`;

    const response = await callLLM(prompt, systemPrompt);

    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const pois = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return c.json({ success: true, pois, count: pois.length });
    } catch {
      return c.json({ success: true, pois: [], count: 0, raw: response });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'POI extraction failed';
    return c.json({ error: message }, 500);
  }
});

// Translate content
aiRouter.post('/translate', async (c) => {
  try {
    const { content, targetLang = 'zh' } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const langNames: Record<string, string> = {
      zh: '中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
    };

    const systemPrompt = '你是一个专业的翻译助手，能够准确地进行多语言翻译。';
    const prompt = `请将以下内容翻译成${langNames[targetLang] || '中文'}，只返回翻译结果，不要包含其他说明：

${content}`;

    const translation = await callLLM(prompt, systemPrompt);
    return c.json({ success: true, translation, targetLang });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Translation failed';
    return c.json({ error: message }, 500);
  }
});

// Chat query
aiRouter.post('/chat', async (c) => {
  try {
    const { message, context } = await c.req.json();

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const systemPrompt = context
      ? `你是一个友好的旅行助手。以下是相关背景信息：\n\n${context}`
      : '你是一个友好的旅行助手，可以回答关于旅行规划、景点推荐等问题。';

    const response = await callLLM(message, systemPrompt);
    return c.json({ success: true, response });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return c.json({ error: msg }, 500);
  }
});

export default aiRouter;

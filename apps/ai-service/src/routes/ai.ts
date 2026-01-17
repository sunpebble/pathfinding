/**
 * AI Processing Routes
 * API endpoints for AI-powered content extraction and summarization
 */

import { Hono } from 'hono';

export const aiRouter = new Hono();

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

/**
 * Call Ollama API
 */
async function callOllama(
  prompt: string,
  options?: { stream?: boolean }
): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: options?.stream ?? false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || '';
}

/**
 * Check Ollama health
 */
async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Health check
aiRouter.get('/health', async (c) => {
  const ollamaHealthy = await checkOllamaHealth();

  return c.json(
    {
      status: ollamaHealthy ? 'healthy' : 'degraded',
      services: {
        ollama: {
          status: ollamaHealthy ? 'healthy' : 'unhealthy',
          url: OLLAMA_BASE_URL,
          model: OLLAMA_MODEL,
        },
      },
      timestamp: new Date().toISOString(),
    },
    ollamaHealthy ? 200 : 503
  );
});

// Get available models
aiRouter.get('/models', async (c) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return c.json({ error: 'Failed to fetch models' }, 503);
    }
    const data = await response.json();
    return c.json({
      models: data.models || [],
      configured_model: OLLAMA_MODEL,
    });
  } catch {
    return c.json({ error: 'Ollama service unavailable' }, 503);
  }
});

// Summarize content
aiRouter.post('/summarize', async (c) => {
  try {
    const { content, maxLength = 500 } = await c.req.json();

    if (!content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    const prompt = `请用中文总结以下内容，限制在${maxLength}字以内，突出关键信息：

${content}

总结：`;

    const summary = await callOllama(prompt);
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

    const prompt = `从以下旅行内容中提取所有景点、餐厅、住宿等地点信息，返回JSON数组格式：

${content}

请返回JSON数组，每个元素包含：name（名称）、type（类型：attraction/restaurant/hotel/transportation）、description（描述）

JSON:`;

    const response = await callOllama(prompt);

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

    const prompt = `请将以下内容翻译成${langNames[targetLang] || '中文'}：

${content}

翻译：`;

    const translation = await callOllama(prompt);
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

    let prompt = message;
    if (context) {
      prompt = `背景信息：${context}\n\n用户问题：${message}\n\n请用中文回答：`;
    }

    const response = await callOllama(prompt);
    return c.json({ success: true, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return c.json({ error: message }, 500);
  }
});

export default aiRouter;

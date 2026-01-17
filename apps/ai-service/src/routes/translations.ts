/**
 * Translation Routes (AI-powered)
 * API endpoints for AI translation services
 */

import { Hono } from 'hono';

export const translationsRouter = new Hono();

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

/**
 * Call Ollama for translation
 */
async function translateWithOllama(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const langNames: Record<string, string> = {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    th: 'ไทย',
    vi: 'Tiếng Việt',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
  };

  const prompt = `请将以下${langNames[sourceLang] || sourceLang}内容翻译成${langNames[targetLang] || targetLang}，只返回翻译结果：

${text}

翻译：`;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.response?.trim() || '';
}

/**
 * Detect language using Ollama
 */
async function detectLanguage(text: string): Promise<string> {
  const prompt = `请识别以下文本的语言，只返回语言代码（zh/en/ja/ko/th/vi/fr/de/es）：

${text}

语言代码：`;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  const detected = data.response?.trim().toLowerCase() || 'unknown';

  // Normalize response
  const langCodes = ['zh', 'en', 'ja', 'ko', 'th', 'vi', 'fr', 'de', 'es'];
  for (const code of langCodes) {
    if (detected.includes(code)) {
      return code;
    }
  }

  return 'unknown';
}

// Translate text
translationsRouter.post('/text', async (c) => {
  try {
    const { text, sourceLang, targetLang = 'zh' } = await c.req.json();

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    // Auto-detect source language if not provided
    const detectedLang = sourceLang || (await detectLanguage(text));

    const translation = await translateWithOllama(
      text,
      detectedLang,
      targetLang
    );

    return c.json({
      success: true,
      data: {
        original: text,
        translation,
        sourceLang: detectedLang,
        targetLang,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Translation failed';
    return c.json({ error: message }, 500);
  }
});

// Detect language
translationsRouter.post('/detect', async (c) => {
  try {
    const { text } = await c.req.json();

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    const detectedLang = await detectLanguage(text);

    return c.json({
      success: true,
      data: {
        text: text.substring(0, 100),
        detectedLanguage: detectedLang,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Detection failed';
    return c.json({ error: message }, 500);
  }
});

// Batch translate
translationsRouter.post('/batch', async (c) => {
  try {
    const { texts, targetLang = 'zh' } = await c.req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return c.json({ error: 'Texts array is required' }, 400);
    }

    if (texts.length > 10) {
      return c.json({ error: 'Maximum 10 texts per batch' }, 400);
    }

    const results = await Promise.all(
      texts.map(async (text: string) => {
        try {
          const detectedLang = await detectLanguage(text);
          const translation = await translateWithOllama(
            text,
            detectedLang,
            targetLang
          );
          return {
            original: text,
            translation,
            sourceLang: detectedLang,
            success: true,
          };
        } catch {
          return {
            original: text,
            error: 'Translation failed',
            success: false,
          };
        }
      })
    );

    return c.json({
      success: true,
      data: results,
      targetLang,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Batch translation failed';
    return c.json({ error: message }, 500);
  }
});

// Health check
translationsRouter.get('/health', async (c) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    const healthy = response.ok;

    return c.json(
      {
        status: healthy ? 'healthy' : 'unhealthy',
        service: 'translations',
        ollama: {
          url: OLLAMA_BASE_URL,
          model: OLLAMA_MODEL,
          available: healthy,
        },
      },
      healthy ? 200 : 503
    );
  } catch {
    return c.json(
      {
        status: 'unhealthy',
        service: 'translations',
        error: 'Ollama service unavailable',
      },
      503
    );
  }
});

export default translationsRouter;

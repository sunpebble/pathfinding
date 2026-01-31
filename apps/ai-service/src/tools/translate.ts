/**
 * Translation Tool
 * LangChain tool for translating text
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createLLM } from '../lib/llm/index.js';

const LANG_NAMES: Record<string, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

/**
 * Translation tool for LangChain agents
 */
export const translateTool = tool(
  async ({ text, targetLang }) => {
    try {
      const llm = createLLM({ temperature: 0.3 });
      const langName = LANG_NAMES[targetLang] || targetLang;

      const prompt = `请将以下内容翻译成${langName}，只返回翻译结果，不要添加任何解释：

${text}

翻译：`;

      const response = await llm.invoke(prompt);
      const translation
        = typeof response.content === 'string'
          ? response.content.trim()
          : JSON.stringify(response.content);

      return JSON.stringify({
        success: true,
        translation,
        targetLang,
        originalLength: text.length,
        translatedLength: translation.length,
      });
    }
    catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error ? error.message : 'Translation service error',
        success: false,
      });
    }
  },
  {
    name: 'translate_text',
    description: '将文本翻译成指定语言',
    schema: z.object({
      text: z.string().describe('要翻译的文本'),
      targetLang: z
        .enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'])
        .describe('目标语言代码：zh(中文), en(英语), ja(日语), ko(韩语) 等'),
    }),
  },
);

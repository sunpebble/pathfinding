/**
 * OpenAI LLM Adapter
 * Wrapper for ChatOpenAI from @langchain/openai
 * Supports custom baseURL for OpenAI-compatible APIs (e.g., Gemini proxy)
 */

import type { LLMConfig } from './types.js';
import { ChatOpenAI } from '@langchain/openai';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

export function createOpenAILLM(config?: Partial<LLMConfig>): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const chatConfig: ConstructorParameters<typeof ChatOpenAI>[0] = {
    apiKey,
    model: config?.model || OPENAI_MODEL,
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens,
  };

  // Add custom baseURL if configured (for OpenAI-compatible APIs like Gemini proxy)
  if (OPENAI_BASE_URL) {
    chatConfig.configuration = {
      baseURL: OPENAI_BASE_URL,
    };
  }

  return new ChatOpenAI(chatConfig);
}

/**
 * Check if OpenAI API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

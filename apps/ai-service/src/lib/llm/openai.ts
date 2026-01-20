/**
 * OpenAI LLM Adapter
 * Wrapper for ChatOpenAI from @langchain/openai
 */

import type { LLMConfig } from './types.js';
import { ChatOpenAI } from '@langchain/openai';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export function createOpenAILLM(config?: Partial<LLMConfig>): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  return new ChatOpenAI({
    apiKey,
    model: config?.model || OPENAI_MODEL,
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens,
  });
}

/**
 * Check if OpenAI API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Claude (Anthropic) LLM Adapter
 * Wrapper for ChatAnthropic from @langchain/anthropic
 */

import type { LLMConfig } from './types.js';
import { ChatAnthropic } from '@langchain/anthropic';

const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';

export function createClaudeLLM(config?: Partial<LLMConfig>): ChatAnthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL;

  return new ChatAnthropic({
    apiKey,
    model: config?.model || ANTHROPIC_MODEL,
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens || 4096,
    ...(baseUrl && { clientOptions: { baseURL: baseUrl } }),
  });
}

/**
 * Check if Anthropic API key is configured
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

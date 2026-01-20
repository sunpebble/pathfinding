/**
 * Ollama LLM Adapter
 * Wrapper for ChatOllama from @langchain/ollama
 */

import type { LLMConfig } from './types.js';
import { ChatOllama } from '@langchain/ollama';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

export function createOllamaLLM(config?: Partial<LLMConfig>): ChatOllama {
  return new ChatOllama({
    baseUrl: OLLAMA_BASE_URL,
    model: config?.model || OLLAMA_MODEL,
    temperature: config?.temperature ?? 0.7,
  });
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Ollama LLM Adapter
 * Wrapper for ChatOllama from @langchain/ollama
 */

import type {LLMConfig} from './types.js';
import { ChatOllama } from '@langchain/ollama';
import { DEFAULT_MODELS  } from './types.js';

/**
 * Get Ollama configuration from environment
 * Read at runtime to ensure dotenv is loaded first
 */
function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || DEFAULT_MODELS.ollama,
  };
}

export function createOllamaLLM(config?: Partial<LLMConfig>): ChatOllama {
  const ollamaConfig = getOllamaConfig();
  return new ChatOllama({
    baseUrl: ollamaConfig.baseUrl,
    model: config?.model || ollamaConfig.model,
    temperature: config?.temperature ?? 0.7,
  });
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  const { baseUrl } = getOllamaConfig();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

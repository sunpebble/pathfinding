/**
 * LLM Factory
 * Unified interface for creating LLM instances across different providers
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig, LLMProvider } from './types.js';
import { createLogger } from '../logger.js';
import { createClaudeLLM, isClaudeConfigured } from './claude.js';
import { checkOllamaHealth, createOllamaLLM } from './ollama.js';
import { createOpenAILLM, isOpenAIConfigured } from './openai.js';
import {
  getDefaultModel,
  getDefaultProvider,

} from './types.js';

const log = createLogger('llm');

export { isClaudeConfigured } from './claude.js';
export { checkOllamaHealth } from './ollama.js';
export { isOpenAIConfigured } from './openai.js';
export * from './types.js';

/**
 * Create an LLM instance based on configuration
 * Uses factory pattern to support multiple providers
 */
export function createLLM(config?: Partial<LLMConfig>): BaseChatModel {
  const provider = config?.provider || getDefaultProvider();
  const model = config?.model || getDefaultModel(provider);

  const fullConfig: LLMConfig = {
    provider,
    model,
    temperature: config?.temperature ?? 0.7,
    streaming: config?.streaming ?? false,
    maxTokens: config?.maxTokens,
  };

  switch (provider) {
    case 'openai':
      return createOpenAILLM(fullConfig);
    case 'claude':
      return createClaudeLLM(fullConfig);
    case 'ollama':
    default:
      return createOllamaLLM(fullConfig);
  }
}

/**
 * Get the best available LLM provider
 * Falls back through providers based on availability
 */
export async function getBestAvailableLLM(
  config?: Partial<Omit<LLMConfig, 'provider'>>,
): Promise<{ llm: BaseChatModel; provider: LLMProvider }> {
  // Try configured provider first
  const preferredProvider = getDefaultProvider();

  // Check provider availability
  const providerChecks: Record<LLMProvider, () => Promise<boolean>> = {
    ollama: checkOllamaHealth,
    openai: async () => isOpenAIConfigured(),
    claude: async () => isClaudeConfigured(),
  };

  // Try preferred provider first
  if (await providerChecks[preferredProvider]()) {
    return {
      llm: createLLM({ ...config, provider: preferredProvider }),
      provider: preferredProvider,
    };
  }

  // Fallback order: ollama -> openai -> claude
  const fallbackOrder: LLMProvider[] = ['ollama', 'openai', 'claude'].filter(
    p => p !== preferredProvider,
  ) as LLMProvider[];

  for (const provider of fallbackOrder) {
    if (await providerChecks[provider]()) {
      log.info(
        { preferredProvider, actualProvider: provider },
        'LLM fallback: preferred provider unavailable',
      );
      return {
        llm: createLLM({ ...config, provider }),
        provider,
      };
    }
  }

  // If nothing works, try ollama anyway (will error if unavailable)
  return {
    llm: createLLM({ ...config, provider: 'ollama' }),
    provider: 'ollama',
  };
}

/**
 * Get provider health status
 */
export async function getProvidersStatus(): Promise<
  Record<LLMProvider, { available: boolean; configured: boolean }>
> {
  const [ollamaHealth] = await Promise.all([checkOllamaHealth()]);

  return {
    ollama: {
      available: ollamaHealth,
      configured: true, // Always configured (uses default URL)
    },
    openai: {
      available: isOpenAIConfigured(),
      configured: isOpenAIConfigured(),
    },
    claude: {
      available: isClaudeConfigured(),
      configured: isClaudeConfigured(),
    },
  };
}

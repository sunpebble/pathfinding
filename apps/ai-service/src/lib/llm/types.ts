/**
 * LLM Types and Interfaces
 * Shared type definitions for the LLM abstraction layer
 */

export type LLMProvider = 'ollama' | 'openai' | 'claude' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
}

export interface LLMProviderConfig {
  ollama: {
    baseUrl: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  claude: {
    apiKey: string;
    model: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
}

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  ollama: 'gemma3:latest',
  openai: 'gpt-4o',
  claude: 'claude-opus-4-5-20251101',
  gemini: 'gemini-2.5-pro-preview-05-06',
};

/**
 * Get the default provider from environment
 */
export function getDefaultProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER as LLMProvider | undefined;
  if (provider && ['ollama', 'openai', 'claude', 'gemini'].includes(provider)) {
    return provider;
  }
  return 'gemini';
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  const envModel = process.env.LLM_MODEL;
  if (envModel)
    return envModel;

  switch (provider) {
    case 'openai':
      return process.env.OPENAI_MODEL || DEFAULT_MODELS.openai;
    case 'claude':
      return process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.claude;
    case 'gemini':
      return process.env.GOOGLE_MODEL || DEFAULT_MODELS.gemini;
    case 'ollama':
    default:
      return process.env.OLLAMA_MODEL || DEFAULT_MODELS.ollama;
  }
}

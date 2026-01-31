import type { LLMConfig } from './types.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const GEMINI_MODEL = process.env.GOOGLE_MODEL || 'gemini-2.5-pro-preview-05-06';

export function createGeminiLLM(config?: Partial<LLMConfig>): ChatGoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set');
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: config?.model || GEMINI_MODEL,
    temperature: config?.temperature ?? 0.7,
    maxOutputTokens: config?.maxTokens || 4096,
  });
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

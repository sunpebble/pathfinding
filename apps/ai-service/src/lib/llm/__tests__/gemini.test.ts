import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeminiLLM, isGeminiConfigured } from '../gemini.js';

describe('gemini LLM Provider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isGeminiConfigured', () => {
    it('should return true when GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
      expect(isGeminiConfigured()).toBe(true);
    });

    it('should return false when GOOGLE_API_KEY is not set', () => {
      delete process.env.GOOGLE_API_KEY;
      expect(isGeminiConfigured()).toBe(false);
    });
  });

  describe('createGeminiLLM', () => {
    it('should throw error when GOOGLE_API_KEY is not set', () => {
      delete process.env.GOOGLE_API_KEY;
      expect(() => createGeminiLLM()).toThrow('GOOGLE_API_KEY is not set');
    });

    it('should create ChatGoogleGenerativeAI instance when API key is set', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
      const llm = createGeminiLLM();
      expect(llm).toBeDefined();
      expect(llm.constructor.name).toBe('ChatGoogleGenerativeAI');
    });

    it('should use custom model when provided', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
      const llm = createGeminiLLM({ model: 'gemini-2.0-flash' });
      expect(llm).toBeDefined();
    });

    it('should use custom temperature when provided', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
      const llm = createGeminiLLM({ temperature: 0.5 });
      expect(llm).toBeDefined();
    });
  });
});

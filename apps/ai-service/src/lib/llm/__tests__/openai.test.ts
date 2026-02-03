/**
 * Tests for OpenAI LLM Adapter
 * Tests initialization and configuration handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use hoisted mock for proper class mocking
const { MockChatOpenAI } = vi.hoisted(() => {
  const MockChatOpenAI = vi.fn();
  return { MockChatOpenAI };
});

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: MockChatOpenAI,
}));

describe('openAI LLM Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    MockChatOpenAI.mockClear();
    MockChatOpenAI.mockImplementation(function (this: unknown, config: Record<string, unknown>) {
      Object.assign(this as object, config, { _type: 'ChatOpenAI' });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('isOpenAIConfigured', () => {
    it('should return true when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      vi.resetModules();
      const { isOpenAIConfigured } = await import('../openai.js');
      expect(isOpenAIConfigured()).toBe(true);
    });

    it('should return false when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      vi.resetModules();
      const { isOpenAIConfigured } = await import('../openai.js');
      expect(isOpenAIConfigured()).toBe(false);
    });

    it('should return false for empty string API key', async () => {
      process.env.OPENAI_API_KEY = '';
      vi.resetModules();
      const { isOpenAIConfigured } = await import('../openai.js');
      expect(isOpenAIConfigured()).toBe(false);
    });
  });

  describe('createOpenAILLM', () => {
    it('should throw error when API key is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');
      expect(() => createOpenAILLM()).toThrow('OPENAI_API_KEY is not set');
    });

    it('should create ChatOpenAI instance with default config', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM();

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'sk-test-key',
          temperature: 0.7,
        }),
      );
    });

    it('should use default model gpt-4o', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      delete process.env.OPENAI_MODEL;
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM();

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
        }),
      );
    });

    it('should use OPENAI_MODEL env var as default', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_MODEL = 'gpt-4-turbo';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM();

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
        }),
      );
    });

    it('should override model with config parameter', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_MODEL = 'default-model';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM({ model: 'gpt-3.5-turbo' });

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        }),
      );
    });

    it('should use custom temperature', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM({ temperature: 0.1 });

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        }),
      );
    });

    it('should include custom baseURL when OPENAI_BASE_URL is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_BASE_URL = 'https://api.custom.com/v1';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM();

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: {
            baseURL: 'https://api.custom.com/v1',
          },
        }),
      );
    });

    it('should pass maxTokens when provided', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      vi.resetModules();
      const { createOpenAILLM } = await import('../openai.js');

      createOpenAILLM({ maxTokens: 2048 });

      expect(MockChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 2048,
        }),
      );
    });
  });
});

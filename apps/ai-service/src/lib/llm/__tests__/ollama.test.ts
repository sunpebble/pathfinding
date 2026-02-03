/**
 * Tests for Ollama LLM Adapter
 * Tests initialization, configuration, and health check
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use hoisted mock for proper class mocking
const { MockChatOllama } = vi.hoisted(() => {
  const MockChatOllama = vi.fn();
  return { MockChatOllama };
});

vi.mock('@langchain/ollama', () => ({
  ChatOllama: MockChatOllama,
}));

// Mock fetch for health check
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ollama LLM Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockFetch.mockReset();
    MockChatOllama.mockClear();
    MockChatOllama.mockImplementation(function (this: unknown, config: Record<string, unknown>) {
      Object.assign(this as object, config, { _type: 'ChatOllama' });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('createOllamaLLM', () => {
    it('should create ChatOllama with default config', async () => {
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_MODEL;
      vi.resetModules();
      const { createOllamaLLM } = await import('../ollama.js');

      createOllamaLLM();

      expect(MockChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:11434',
          temperature: 0.7,
        }),
      );
    });

    it('should use custom baseUrl from environment', async () => {
      process.env.OLLAMA_BASE_URL = 'http://custom:11434';
      vi.resetModules();
      const { createOllamaLLM } = await import('../ollama.js');

      createOllamaLLM();

      expect(MockChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://custom:11434',
        }),
      );
    });

    it('should use custom model from environment', async () => {
      process.env.OLLAMA_MODEL = 'llama3:70b';
      vi.resetModules();
      const { createOllamaLLM } = await import('../ollama.js');

      createOllamaLLM();

      expect(MockChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama3:70b',
        }),
      );
    });

    it('should override model with config parameter', async () => {
      process.env.OLLAMA_MODEL = 'default-model';
      vi.resetModules();
      const { createOllamaLLM } = await import('../ollama.js');

      createOllamaLLM({ model: 'override-model' });

      expect(MockChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'override-model',
        }),
      );
    });

    it('should use custom temperature', async () => {
      vi.resetModules();
      const { createOllamaLLM } = await import('../ollama.js');

      createOllamaLLM({ temperature: 0.2 });

      expect(MockChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2,
        }),
      );
    });
  });

  describe('checkOllamaHealth', () => {
    it('should return true when Ollama is available', async () => {
      delete process.env.OLLAMA_BASE_URL; // Ensure default URL is used
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });
      vi.resetModules();
      const { checkOllamaHealth } = await import('../ollama.js');
      const result = await checkOllamaHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return false when Ollama is not available', async () => {
      delete process.env.OLLAMA_BASE_URL;
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      vi.resetModules();
      const { checkOllamaHealth } = await import('../ollama.js');
      const result = await checkOllamaHealth();

      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      delete process.env.OLLAMA_BASE_URL;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.resetModules();
      const { checkOllamaHealth } = await import('../ollama.js');
      const result = await checkOllamaHealth();

      expect(result).toBe(false);
    });

    it('should use custom baseUrl for health check', async () => {
      process.env.OLLAMA_BASE_URL = 'http://remote:11434';
      mockFetch.mockResolvedValue({ ok: true });
      vi.resetModules();
      const { checkOllamaHealth } = await import('../ollama.js');
      await checkOllamaHealth();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://remote:11434/api/tags',
        expect.anything(),
      );
    });
  });
});

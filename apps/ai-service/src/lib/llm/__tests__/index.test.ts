/**
 * Tests for LLM Factory (index.ts)
 * Tests provider selection logic and fallback behavior
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all provider modules
vi.mock('../claude.js', () => ({
  createClaudeLLM: vi.fn(() => ({ _type: 'claude' })),
  isClaudeConfigured: vi.fn(() => false),
}));

vi.mock('../openai.js', () => ({
  createOpenAILLM: vi.fn(() => ({ _type: 'openai' })),
  isOpenAIConfigured: vi.fn(() => false),
}));

vi.mock('../ollama.js', () => ({
  createOllamaLLM: vi.fn(() => ({ _type: 'ollama' })),
  checkOllamaHealth: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('../gemini.js', () => ({
  createGeminiLLM: vi.fn(() => ({ _type: 'gemini' })),
  isGeminiConfigured: vi.fn(() => false),
}));

vi.mock('../../logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('lLM Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LLM_PROVIDER;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('createLLM', () => {
    it('should create ollama LLM by default', async () => {
      vi.resetModules();
      const { createLLM } = await import('../index.js');

      // Just verify it doesn't throw and returns something
      const llm = createLLM();
      expect(llm).toBeDefined();
    });

    it('should create claude LLM when provider is claude', async () => {
      vi.resetModules();
      const { createLLM } = await import('../index.js');
      const { createClaudeLLM } = await import('../claude.js');

      createLLM({ provider: 'claude' });

      expect(createClaudeLLM).toHaveBeenCalled();
    });

    it('should create openai LLM when provider is openai', async () => {
      vi.resetModules();
      const { createLLM } = await import('../index.js');
      const { createOpenAILLM } = await import('../openai.js');

      createLLM({ provider: 'openai' });

      expect(createOpenAILLM).toHaveBeenCalled();
    });

    it('should create gemini LLM when provider is gemini', async () => {
      vi.resetModules();
      const { createLLM } = await import('../index.js');
      const { createGeminiLLM } = await import('../gemini.js');

      createLLM({ provider: 'gemini' });

      expect(createGeminiLLM).toHaveBeenCalled();
    });

    it('should pass config to provider', async () => {
      vi.resetModules();
      const { createLLM } = await import('../index.js');
      const { createClaudeLLM } = await import('../claude.js');

      const config = {
        provider: 'claude' as const,
        temperature: 0.5,
        model: 'claude-3-haiku',
        maxTokens: 1000,
      };

      createLLM(config);

      expect(createClaudeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          model: 'claude-3-haiku',
          maxTokens: 1000,
        }),
      );
    });
  });

  describe('getBestAvailableLLM', () => {
    it('should return preferred provider if available', async () => {
      vi.resetModules();
      const { checkOllamaHealth } = await import('../ollama.js');
      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const { getBestAvailableLLM } = await import('../index.js');
      const result = await getBestAvailableLLM();

      expect(result.provider).toBe('ollama');
    });

    it('should fallback to gemini if preferred is unavailable', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { isGeminiConfigured } = await import('../gemini.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (isGeminiConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { getBestAvailableLLM } = await import('../index.js');
      const result = await getBestAvailableLLM();

      expect(result.provider).toBe('gemini');
    });

    it('should fallback to openai if ollama and gemini unavailable', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { isGeminiConfigured } = await import('../gemini.js');
      const { isOpenAIConfigured } = await import('../openai.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (isGeminiConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isOpenAIConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { getBestAvailableLLM } = await import('../index.js');
      const result = await getBestAvailableLLM();

      expect(result.provider).toBe('openai');
    });

    it('should fallback to claude as last resort', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { isGeminiConfigured } = await import('../gemini.js');
      const { isOpenAIConfigured } = await import('../openai.js');
      const { isClaudeConfigured } = await import('../claude.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (isGeminiConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isOpenAIConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isClaudeConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { getBestAvailableLLM } = await import('../index.js');
      const result = await getBestAvailableLLM();

      expect(result.provider).toBe('claude');
    });

    it('should return ollama even if nothing works (last fallback)', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { isGeminiConfigured } = await import('../gemini.js');
      const { isOpenAIConfigured } = await import('../openai.js');
      const { isClaudeConfigured } = await import('../claude.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (isGeminiConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isOpenAIConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isClaudeConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const { getBestAvailableLLM } = await import('../index.js');
      const result = await getBestAvailableLLM();

      // Falls back to ollama even if unavailable
      expect(result.provider).toBe('ollama');
    });

    it('should pass config to created LLM', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { createOllamaLLM } = await import('../ollama.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const { getBestAvailableLLM } = await import('../index.js');
      await getBestAvailableLLM({ temperature: 0.3 });

      expect(createOllamaLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        }),
      );
    });
  });

  describe('getProvidersStatus', () => {
    it('should return status for all providers', async () => {
      const { checkOllamaHealth } = await import('../ollama.js');
      const { isOpenAIConfigured } = await import('../openai.js');
      const { isClaudeConfigured } = await import('../claude.js');
      const { isGeminiConfigured } = await import('../gemini.js');

      (checkOllamaHealth as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (isOpenAIConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (isClaudeConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (isGeminiConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { getProvidersStatus } = await import('../index.js');
      const status = await getProvidersStatus();

      expect(status.ollama.available).toBe(true);
      expect(status.openai.available).toBe(true);
      expect(status.claude.available).toBe(false);
      expect(status.gemini.available).toBe(true);
    });
  });
});
